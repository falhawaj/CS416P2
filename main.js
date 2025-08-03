const svg1 = d3.select("#circuit-plot");
const svg2 = d3.select("#lap-plot");

const margin = { top: 20, right: 30, bottom: 120, left: 60 };
const width = 1000 - margin.left - margin.right;
const height = 450 - margin.top - margin.bottom;

const g1 = svg1.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

let minLapData, allLapData, raceResults;

const driverColors = {
  "Max Verstappen": "#003773",
  "Sergio Pérez": "#E30118",
  "Lewis Hamilton": "#565F64",
  "Fernando Alonso": "#229971"
};

Promise.all([
  d3.csv("data/min_lap_times_with_names.csv", d3.autoType),
  d3.csv("data/lap_times_with_names.csv", d3.autoType),
  d3.csv("data/results_with_names.csv", d3.autoType)
]).then(([minData, allData, resultData]) => {
  [minData, allData, resultData].forEach(data => {
    data.forEach(d => {
      if (d.driverName === "Sergio PÃ©rez") d.driverName = "Sergio Pérez";
    });
  });

  minLapData = minData;
  allLapData = allData;
  raceResults = resultData;

  d3.select("#driver-select").on("change", updateScene);
  updateScene();
});

function updateScene() {
  const selectedDriver = d3.select("#driver-select").property("value");

  const driverMinLaps = minLapData.filter(d => d.driverName === selectedDriver);
  const verstappenMinLaps = minLapData.filter(d => d.driverName === "Max Verstappen");
  const verstappenMap = new Map(verstappenMinLaps.map(d => [d.circuitName, d.time_ms]));

  let processedData;

  if (selectedDriver === "Max Verstappen") {
    processedData = driverMinLaps.map(d => ({
      circuitName: d.circuitName,
      shortName: d.circuitName.replace(" Grand Prix", ""),
      time: d.time_ms
    }));
    d3.select("#primary-title").text("Fastest Lap Time vs. Circuit");
  } else {
    processedData = driverMinLaps
      .filter(d => verstappenMap.has(d.circuitName))
      .map(d => ({
        circuitName: d.circuitName,
        shortName: d.circuitName.replace(" Grand Prix", ""),
        timeDiff: d.time_ms - verstappenMap.get(d.circuitName)
      }));
    d3.select("#primary-title").text("Difference in Fastest Lap (vs. Verstappen) vs. Circuit");
  }

  const x = d3.scalePoint()
    .domain(processedData.map(d => d.shortName))
    .range([0, width])
    .padding(0.5);

  const y = d3.scaleLinear()
    .domain([
      d3.min(processedData, d => selectedDriver === "Max Verstappen" ? d.time : d.timeDiff) - 1000,
      d3.max(processedData, d => selectedDriver === "Max Verstappen" ? d.time : d.timeDiff) + 1000
    ])
    .range([height, 0]);

  g1.selectAll("*").remove();

  // X Axis
  g1.append("g")
    .attr("transform", `translate(0,${height})`)
    .call(d3.axisBottom(x))
    .selectAll("text")
    .style("text-anchor", "end")
    .attr("transform", "rotate(-45)")
    .style("cursor", "pointer")
    .on("click", function(_, labelText) {
      const clickedData = processedData.find(d => d.shortName === labelText);
      if (clickedData && clickedData.circuitName) {
        showLapPlot(selectedDriver, clickedData.circuitName);
      }
    });

  g1.append("text")
    .attr("x", width / 2)
    .attr("y", height + 90)
    .attr("text-anchor", "middle")
    .text("Grand Prix");

  // Y Axis
  g1.append("g").call(d3.axisLeft(y));

  g1.append("text")
    .attr("transform", "rotate(-90)")
    .attr("y", -50)
    .attr("x", -height / 2)
    .attr("text-anchor", "middle")
    .text(selectedDriver === "Max Verstappen" ? "Fastest Lap (ms)" : "Difference to Verstappen (ms)");

  if (selectedDriver !== "Max Verstappen") {
    g1.append("line")
      .attr("x1", 0)
      .attr("x2", width)
      .attr("y1", y(0))
      .attr("y2", y(0))
      .attr("stroke", "#003773")
      .attr("stroke-dasharray", "5,5")
      .attr("stroke-width", 1);
  }

  const yAccessor = d => selectedDriver === "Max Verstappen" ? d.time : d.timeDiff;
  const color = driverColors[selectedDriver];

  processedData.forEach(d => {
    d.x = x(d.shortName);
    d.y = y(yAccessor(d));
  });

  g1.selectAll("circle")
    .data(processedData)
    .enter()
    .append("circle")
    .attr("cx", d => d.x)
    .attr("cy", d => d.y)
    .attr("r", 5)
    .attr("fill", color)
    .style("cursor", "pointer")
    .on("click", (_, d) => showLapPlot(selectedDriver, d.circuitName));

  const line = d3.line()
    .x(d => d.x)
    .y(d => d.y);

  g1.append("path")
    .datum(processedData)
    .attr("fill", "none")
    .attr("stroke", color)
    .attr("stroke-width", 2)
    .attr("d", line);

  // Legend
  const legend = svg1.append("g")
    .attr("transform", `translate(${margin.left + 10}, 10)`);

  legend.append("rect").attr("width", 15).attr("height", 15).attr("fill", color);
  legend.append("text").attr("x", 20).attr("y", 12).text(selectedDriver);

  if (selectedDriver !== "Max Verstappen") {
    legend.append("rect")
      .attr("x", 100).attr("width", 15).attr("height", 15)
      .attr("fill", "none").attr("stroke", "#003773").attr("stroke-dasharray", "4,2");

    legend.append("text").attr("x", 120).attr("y", 12).text("Max Verstappen");
  }

  svg2.classed("hidden", true);
}

function showLapPlot(driverName, circuitName) {
  svg2.html("");
  svg2.classed("hidden", false);

  const margin = { top: 60, right: 60, bottom: 60, left: 80 };
  const width = 1000 - margin.left - margin.right;
  const height = 450 - margin.top - margin.bottom;

  const g2 = svg2
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  const driverLaps = allLapData.filter(
    d => d.driverName === driverName && d.circuitName === circuitName
  );

  const verstappenLaps = allLapData.filter(
    d => d.driverName === "Max Verstappen" && d.circuitName === circuitName
  );

  if (driverLaps.length === 0) {
    g2.append("text").text("No data found.").attr("x", 100).attr("y", 100);
    return;
  }

  const x = d3.scaleLinear()
    .domain(d3.extent(driverLaps, d => d.lap))
    .range([0, width]);

  const y = d3.scaleLinear()
    .domain([
      d3.min(driverLaps.concat(verstappenLaps), d => d.time_ms) - 1000,
      d3.max(driverLaps.concat(verstappenLaps), d => d.time_ms) + 1000
    ])
    .range([height, 0]);

  g2.append("g")
    .attr("transform", `translate(0, ${height})`)
    .call(d3.axisBottom(x).ticks(10));

  g2.append("g").call(d3.axisLeft(y));

  g2.append("text")
    .attr("x", width / 2)
    .attr("y", height + 40)
    .attr("text-anchor", "middle")
    .text("Lap");

  g2.append("text")
    .attr("x", -height / 2)
    .attr("y", -50)
    .attr("transform", "rotate(-90)")
    .attr("text-anchor", "middle")
    .text("Lap Time (ms)");

  g2.append("text")
    .attr("x", width / 2)
    .attr("y", -20)
    .attr("text-anchor", "middle")
    .attr("font-size", "16px")
    .text(`Lap Time vs. Lap for ${circuitName}`);

  const line = d3.line()
    .x(d => x(d.lap))
    .y(d => y(d.time_ms));

  const mainColor = driverColors[driverName];

  g2.append("path")
    .datum(driverLaps)
    .attr("fill", "none")
    .attr("stroke", mainColor)
    .attr("stroke-width", 2)
    .attr("d", line);

  g2.selectAll(".dot")
    .data(driverLaps)
    .enter()
    .append("circle")
    .attr("cx", d => x(d.lap))
    .attr("cy", d => y(d.time_ms))
    .attr("r", 4)
    .attr("fill", mainColor);

  if (driverName !== "Max Verstappen") {
    g2.append("path")
      .datum(verstappenLaps)
      .attr("fill", "none")
      .attr("stroke", "#003773")
      .attr("stroke-dasharray", "5,5")
      .attr("stroke-width", 2)
      .attr("d", line);

    g2.selectAll(".ref-dot")
      .data(verstappenLaps)
      .enter()
      .append("circle")
      .attr("cx", d => x(d.lap))
      .attr("cy", d => y(d.time_ms))
      .attr("r", 4)
      .attr("fill", "#003773");
  }

  // Legend
  const legend = svg2.append("g")
    .attr("transform", `translate(${margin.left + 10}, 10)`);

  legend.append("rect").attr("width", 15).attr("height", 15).attr("fill", mainColor);
  legend.append("text").attr("x", 20).attr("y", 12).text(driverName);

  if (driverName !== "Max Verstappen") {
    legend.append("rect")
      .attr("x", 100).attr("width", 15).attr("height", 15)
      .attr("fill", "none").attr("stroke", "#003773").attr("stroke-dasharray", "4,2");

    legend.append("text").attr("x", 120).attr("y", 12).text("Max Verstappen");
  }
}
