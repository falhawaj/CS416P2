const svg1 = d3.select("#circuit-plot");
const svg2 = d3.select("#lap-plot");
const lapPlotContainer = d3.select("#lap-plot-container");
const lapTitle = d3.select("#lap-title");
const primaryTitle = d3.select("#primary-title");

const margin = { top: 20, right: 30, bottom: 120, left: 60 };
const width = 800 - margin.left - margin.right;
const height = 450 - margin.top - margin.bottom;

const g1 = svg1.append("g").attr("transform", `translate(${margin.left},${margin.top})`);
const g2 = svg2.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

let minLapData, allLapData;

const driverColors = {
  "Max Verstappen": "#003773",
  "Sergio Pérez": "#E30118",
  "Lewis Hamilton": "#565F64",
  "Fernando Alonso": "#229971"
};

Promise.all([
  d3.csv("data/min_lap_times_with_names.csv", d3.autoType),
  d3.csv("data/lap_times_with_names.csv", d3.autoType)
]).then(([minData, allData]) => {
  minLapData = minData;
  allLapData = allData;

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
    primaryTitle.text("Fastest Lap Time vs. Circuit");
  } else {
    processedData = driverMinLaps
      .filter(d => verstappenMap.has(d.circuitName))
      .map(d => ({
        circuitName: d.circuitName,
        shortName: d.circuitName.replace(" Grand Prix", ""),
        timeDiff: d.time_ms - verstappenMap.get(d.circuitName)
      }));
    primaryTitle.text("Difference in Fastest Lap (vs. Verstappen) vs. Circuit");
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

  // X-axis
  const xAxis = g1.append("g")
    .attr("transform", `translate(0,${height})`)
    .call(d3.axisBottom(x));

  xAxis.selectAll("text")
    .style("text-anchor", "end")
    .attr("transform", "rotate(-45)")
    .style("cursor", "pointer")
    .on("click", (_, circuitShort) => {
      const full = processedData.find(d => d.shortName === circuitShort)?.circuitName;
      if (full) showLapPlot(selectedDriver, full);
    });

  g1.append("text")
    .attr("x", width / 2)
    .attr("y", height + 90)
    .attr("text-anchor", "middle")
    .text("Grand Prix");

  // Y-axis
  g1.append("g").call(d3.axisLeft(y));
  g1.append("text")
    .attr("transform", "rotate(-90)")
    .attr("y", -50)
    .attr("x", -height / 2)
    .attr("text-anchor", "middle")
    .text(selectedDriver === "Max Verstappen" ? "Fastest Lap (ms)" : "Difference to Verstappen (ms)");

  // Zero reference line
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

  g1.selectAll("circle")
    .data(processedData)
    .enter()
    .append("circle")
    .attr("cx", d => x(d.shortName))
    .attr("cy", d => y(yAccessor(d)))
    .attr("r", 5)
    .attr("fill", color)
    .style("cursor", "pointer")
    .on("click", (_, d) => showLapPlot(selectedDriver, d.circuitName));

  const line = d3.line()
    .x(d => x(d.shortName))
    .y(d => y(yAccessor(d)));

  g1.append("path")
    .datum(processedData)
    .attr("fill", "none")
    .attr("stroke", color)
    .attr("stroke-dasharray", "0")
    .attr("stroke-width", 2)
    .attr("d", line);

  // Legend for non-Verstappen drivers
  if (selectedDriver !== "Max Verstappen") {
    g1.append("circle").attr("cx", width - 150).attr("cy", -10).attr("r", 5).attr("fill", color);
    g1.append("text").attr("x", width - 140).attr("y", -6).text(selectedDriver).attr("class", "legend");

    g1.append("line")
      .attr("x1", width - 150).attr("x2", width - 140)
      .attr("y1", 10).attr("y2", 10)
      .attr("stroke", "#003773").attr("stroke-dasharray", "5,5").attr("stroke-width", 2);

    g1.append("text").attr("x", width - 135).attr("y", 14).text("Verstappen").attr("class", "legend");
  }

  lapPlotContainer.classed("hidden", true);
}

function showLapPlot(driverName, circuitName) {
  const driverLaps = allLapData.filter(d => d.driverName === driverName && d.circuitName === circuitName);
  const verstappenLaps = allLapData.filter(d => d.driverName === "Max Verstappen" && d.circuitName === circuitName);

  if (driverLaps.length === 0) return;

  lapTitle.text(`Lap Time vs. Lap for ${circuitName}`);

  const allLaps = driverName === "Max Verstappen" ? driverLaps : driverLaps.concat(verstappenLaps);

  const x = d3.scaleLinear()
    .domain([1, d3.max(allLaps, d => d.lap)])
    .range([0, width]);

  const y = d3.scaleLinear()
    .domain([
      d3.min(allLaps, d => d.time_ms) - 1000,
      d3.max(allLaps, d => d.time_ms) + 1000
    ])
    .range([height, 0]);

  g2.selectAll("*").remove();

  g2.append("g").attr("transform", `translate(0,${height})`).call(d3.axisBottom(x));
  g2.append("text")
    .attr("x", width / 2)
    .attr("y", height + 40)
    .attr("text-anchor", "middle")
    .text("Lap");

  g2.append("g").call(d3.axisLeft(y));
  g2.append("text")
    .attr("transform", "rotate(-90)")
    .attr("y", -50)
    .attr("x", -height / 2)
    .attr("text-anchor", "middle")
    .text("Lap Time (ms)");

  const line = d3.line()
    .x(d => x(d.lap))
    .y(d => y(d.time_ms));

  const driverColor = driverColors[driverName];

  g2.append("path")
    .datum(driverLaps)
    .attr("fill", "none")
    .attr("stroke", driverColor)
    .attr("stroke-width", 2)
    .attr("stroke-dasharray", "0")
    .attr("d", line);

  g2.selectAll("circle.driver")
    .data(driverLaps)
    .enter()
    .append("circle")
    .attr("class", "driver")
    .attr("cx", d => x(d.lap))
    .attr("cy", d => y(d.time_ms))
    .attr("r", 4)
    .attr("fill", driverColor);

  if (driverName !== "Max Verstappen" && verstappenLaps.length > 0) {
    g2.append("path")
      .datum(verstappenLaps)
      .attr("fill", "none")
      .attr("stroke", "#003773")
      .attr("stroke-dasharray", "5,5")
      .attr("stroke-width", 2)
      .attr("d", line);

    g2.selectAll("circle.ref")
      .data(verstappenLaps)
      .enter()
      .append("circle")
      .attr("class", "ref")
      .attr("cx", d => x(d.lap))
      .attr("cy", d => y(d.time_ms))
      .attr("r", 4)
      .attr("fill", "#003773");
  }

  lapPlotContainer.classed("hidden", false);
}
