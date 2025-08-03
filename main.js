const svg1 = d3.select("#circuit-plot");
const svg2 = d3.select("#lap-plot");

const margin = { top: 20, right: 30, bottom: 120, left: 60 };
const width = 1000 - margin.left - margin.right;
const height = 450 - margin.top - margin.bottom;

const g1 = svg1.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

let minLapData, allLapData, dnfResults;

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
]).then(([minData, allData, resultsData]) => {
  [minData, allData, resultsData].forEach(data => {
    data.forEach(d => {
      if (d.driverName === "Sergio PÃ©rez") d.driverName = "Sergio Pérez";
    });
  });

  minLapData = minData;
  allLapData = allData;
  dnfResults = resultsData.filter(d => d.position === "\\N");

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

  g1.append("g")
    .attr("transform", `translate(0,${height})`)
    .call(d3.axisBottom(x))
    .selectAll("text")
    .style("text-anchor", "end")
    .attr("transform", "rotate(-45)")
    .style("cursor", "pointer")
    .on("click", function(_, labelText) {
      const clicked = processedData.find(d => d.shortName === labelText);
      if (clicked) showLapPlot(selectedDriver, clicked.circuitName);
    });

  g1.append("text")
    .attr("x", width / 2)
    .attr("y", height + 90)
    .attr("text-anchor", "middle")
    .text("Grand Prix");

  g1.append("g").call(d3.axisLeft(y));

  g1.append("text")
    .attr("transform", "rotate(-90)")
    .attr("y", -50)
    .attr("x", -height / 2)
    .attr("text-anchor", "middle")
    .text(selectedDriver === "Max Verstappen" ? "Fastest Lap (ms)" : "Difference to Verstappen (ms)");

  if (selectedDriver !== "Max Verstappen") {
    g1.append("line")
      .attr("x1", 0).attr("x2", width)
      .attr("y1", y(0)).attr("y2", y(0))
      .attr("stroke", "#003773")
      .attr("stroke-dasharray", "5,5");
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

  const line = d3.line().x(d => d.x).y(d => d.y);

  g1.append("path")
    .datum(processedData)
    .attr("fill", "none")
    .attr("stroke", color)
    .attr("stroke-width", 2)
    .attr("d", line);

  svg1.selectAll(".legend-group").remove();
  const legend = svg1.append("g")
    .attr("class", "legend-group")
    .attr("transform", `translate(${margin.left + 10}, 10)`);

  legend.append("line")
    .attr("x1", 0).attr("x2", 20)
    .attr("y1", 0).attr("y2", 0)
    .attr("stroke", color)
    .attr("stroke-width", 2);

  legend.append("circle")
    .attr("cx", 10).attr("cy", 0)
    .attr("r", 4).attr("fill", color);

  legend.append("text")
    .attr("x", 30).attr("y", 5)
    .text(selectedDriver);

  if (selectedDriver !== "Max Verstappen") {
    legend.append("line")
      .attr("x1", 0).attr("x2", 20)
      .attr("y1", 20).attr("y2", 20)
      .attr("stroke", "#003773")
      .attr("stroke-width", 2)
      .attr("stroke-dasharray", "4,2");

    legend.append("circle")
      .attr("cx", 10).attr("cy", 20)
      .attr("r", 4)
      .attr("fill", "#003773");

    legend.append("text")
      .attr("x", 30).attr("y", 25)
      .text("Max Verstappen");
  }

  const annotations = [];
  const addAnnotation = (shortName, message) => {
    const pt = processedData.find(d => d.shortName === shortName);
    if (pt) {
      annotations.push({
        note: { label: message, title: shortName },
        x: pt.x,
        y: pt.y,
        dx: 0,
        dy: -40
      });
    }
  };

  if (selectedDriver === "Max Verstappen") addAnnotation("Dutch", "Verstappen’s home race");
  if (selectedDriver === "Sergio Pérez") addAnnotation("Mexico City", "Pérez’s home race");
  if (selectedDriver === "Lewis Hamilton") addAnnotation("British", "Hamilton’s home country");
  if (selectedDriver === "Fernando Alonso") addAnnotation("Spanish", "Alonso’s home country");

  // Add DNF annotations
  const dnfEntries = dnfResults.filter(d => d.driverName === selectedDriver);
  dnfEntries.forEach(entry => {
    const shortName = entry.circuitName.replace(" Grand Prix", "");
    const pt = processedData.find(d => d.shortName === shortName);
    if (pt) {
      annotations.push({
        note: {
          label: `${selectedDriver} did not finish the race.`,
          title: shortName
        },
        x: pt.x,
        y: pt.y,
        dx: 0,
        dy: -60
      });
    }
  });

  if (annotations.length > 0) {
    const makeAnnotations = d3.annotation()
      .type(d3.annotationLabel)
      .annotations(annotations);

    g1.append("g").attr("class", "annotation-group").call(makeAnnotations);
  }

  svg2.classed("hidden", true);
}

// showLapPlot() unchanged — you already have it
