let allLapData = [], fastestLaps = [];
const svg1 = d3.select("#primary");
const svg2 = d3.select("#secondary");

const driverColors = {
  "Max Verstappen": "#003773",
  "Sergio Pérez": "#E30118",
  "Lewis Hamilton": "#565F64",
  "Fernando Alonso": "#229971"
};

d3.csv("lap_times_with_names.csv", d3.autoType).then(allData => {
  d3.csv("min_lap_times_with_names.csv", d3.autoType).then(minData => {
    allLapData = allData;
    fastestLaps = minData;
    loadDriver("Max Verstappen");
  });
});

function loadDriver(driverName) {
  d3.select("#main-title").text(driverName === "Max Verstappen"
    ? "Fastest Lap Time vs. Circuit"
    : `Difference in Fastest Lap vs. Circuit (Compared to Verstappen)`);
  updateScene(driverName);
}

function updateScene(driverName) {
  svg1.html("");
  svg2.classed("hidden", true);

  const margin = { top: 60, right: 40, bottom: 120, left: 80 };
  const width = +svg1.attr("width") - margin.left - margin.right;
  const height = +svg1.attr("height") - margin.top - margin.bottom;

  const g1 = svg1.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

  const driverLaps = fastestLaps.filter(d => d.driverName === driverName);
  const verstappenLaps = fastestLaps.filter(d => d.driverName === "Max Verstappen");

  const circuits = driverLaps.map(d => d.circuitName.replace(" Grand Prix", ""));
  const x = d3.scalePoint().domain(circuits).range([0, width]).padding(0.5);

  let yDomain, yLabel;
  let processedData;

  if (driverName === "Max Verstappen") {
    yLabel = "Fastest Lap Time (ms)";
    yDomain = d3.extent(driverLaps, d => d.time_ms);
    processedData = driverLaps.map(d => ({
      x: x(d.circuitName.replace(" Grand Prix", "")),
      y: d.time_ms,
      circuitName: d.circuitName,
      shortName: d.circuitName.replace(" Grand Prix", "")
    }));
  } else {
    yLabel = "Lap Time Difference from Verstappen (ms)";
    processedData = driverLaps.map(d => {
      const ref = verstappenLaps.find(v => v.raceId === d.raceId);
      return {
        x: x(d.circuitName.replace(" Grand Prix", "")),
        y: d.time_ms - (ref?.time_ms || 0),
        circuitName: d.circuitName,
        shortName: d.circuitName.replace(" Grand Prix", "")
      };
    });
    yDomain = d3.extent(processedData, d => d.y);
  }

  const y = d3.scaleLinear().domain([yDomain[0] * 0.98, yDomain[1] * 1.02]).range([height, 0]);

  g1.append("g")
    .attr("transform", `translate(0,${height})`)
    .call(d3.axisBottom(x))
    .selectAll("text")
    .attr("transform", "rotate(-45)")
    .style("text-anchor", "end")
    .on("click", (event, d) => showLapPlot(driverName, d + " Grand Prix"));

  g1.append("g").call(d3.axisLeft(y));

  g1.append("text")
    .attr("x", width / 2)
    .attr("y", height + 80)
    .attr("text-anchor", "middle")
    .text("Grand Prix");

  g1.append("text")
    .attr("x", -height / 2)
    .attr("y", -60)
    .attr("transform", "rotate(-90)")
    .attr("text-anchor", "middle")
    .text(yLabel);

  const line = d3.line().x(d => d.x).y(d => d.y);

  g1.append("path")
    .datum(processedData)
    .attr("fill", "none")
    .attr("stroke", driverColors[driverName])
    .attr("stroke-width", 2)
    .attr("d", line);

  g1.selectAll(".dot")
    .data(processedData)
    .enter()
    .append("circle")
    .attr("cx", d => d.x)
    .attr("cy", d => d.y)
    .attr("r", 4)
    .attr("fill", driverColors[driverName])
    .on("click", d => showLapPlot(driverName, d.circuitName));

  if (driverName !== "Max Verstappen") {
    const refLine = verstappenLaps.map(d => ({
      x: x(d.circuitName.replace(" Grand Prix", "")),
      y: 0
    }));

    g1.append("path")
      .datum(refLine)
      .attr("fill", "none")
      .attr("stroke", "#003773")
      .attr("stroke-dasharray", "4 2")
      .attr("stroke-width", 2)
      .attr("d", line);
  }

  const legend = svg1.append("g")
    .attr("transform", "translate(100, 20)");

  legend.append("line")
    .attr("x1", 0).attr("x2", 20).attr("y1", 0).attr("y2", 0)
    .attr("stroke", driverColors[driverName])
    .attr("stroke-width", 2);

  legend.append("circle")
    .attr("cx", 10).attr("cy", 0).attr("r", 4)
    .attr("fill", driverColors[driverName]);

  legend.append("text")
    .attr("x", 30).attr("y", 5)
    .text(driverName);

  if (driverName !== "Max Verstappen") {
    legend.append("line")
      .attr("x1", 0).attr("x2", 20).attr("y1", 20).attr("y2", 20)
      .attr("stroke", "#003773")
      .attr("stroke-width", 2)
      .attr("stroke-dasharray", "4 2");

    legend.append("circle")
      .attr("cx", 10).attr("cy", 20).attr("r", 4)
      .attr("fill", "#003773");

    legend.append("text")
      .attr("x", 30).attr("y", 25)
      .text("Max Verstappen");
  }

  // === Annotations ===
  const annotationMap = {
    "Max Verstappen": { circuit: "Dutch", message: "Verstappen’s home race" },
    "Sergio Pérez": { circuit: "Mexico City", message: "Pérez’s home race" },
    "Lewis Hamilton": { circuit: "British", message: "Hamilton’s home country" },
    "Fernando Alonso": { circuit: "Spanish", message: "Alonso’s home country" }
  };

  const note = annotationMap[driverName];
  if (note) {
    const pt = processedData.find(d => d.shortName === note.circuit);
    if (pt) {
      const annotation = d3.annotation()
        .type(d3.annotationLabel)
        .annotations([
          {
            note: { label: note.message, title: note.circuit },
            x: pt.x,
            y: pt.y,
            dx: 0,
            dy: -40
          }
        ]);
      g1.append("g").attr("class", "annotation-group").call(annotation);
    }
  }
}

function showLapPlot(driverName, circuitName) {
  svg2.html("").classed("hidden", false);
  const margin = { top: 60, right: 40, bottom: 60, left: 80 };
  const width = +svg2.attr("width") - margin.left - margin.right;
  const height = +svg2.attr("height") - margin.top - margin.bottom;

  const g2 = svg2.append("g").attr("transform", `translate(${margin.left},${margin.top})`);
  const driverLaps = allLapData.filter(d => d.driverName === driverName && d.circuitName === circuitName);
  const refLaps = allLapData.filter(d => d.driverName === "Max Verstappen" && d.circuitName === circuitName);

  const allLaps = driverLaps.concat(refLaps);
  const x = d3.scaleLinear().domain(d3.extent(allLaps, d => d.lap)).range([0, width]);
  const y = d3.scaleLinear().domain(d3.extent(allLaps, d => d.time_ms)).range([height, 0]);

  g2.append("g").attr("transform", `translate(0,${height})`).call(d3.axisBottom(x));
  g2.append("g").call(d3.axisLeft(y));

  g2.append("text")
    .attr("x", width / 2).attr("y", -20).attr("text-anchor", "middle")
    .text(`Lap Time vs. Lap for ${circuitName}`);

  g2.append("text")
    .attr("x", width / 2).attr("y", height + 40).attr("text-anchor", "middle")
    .text("Lap");

  g2.append("text")
    .attr("x", -height / 2).attr("y", -50)
    .attr("transform", "rotate(-90)").attr("text-anchor", "middle")
    .text("Lap Time");

  const line = d3.line().x(d => x(d.lap)).y(d => y(d.time_ms));

  g2.append("path")
    .datum(driverLaps)
    .attr("fill", "none").attr("stroke", driverColors[driverName])
    .attr("stroke-width", 2).attr("d", line);

  g2.selectAll(".dot")
    .data(driverLaps).enter()
    .append("circle")
    .attr("cx", d => x(d.lap)).attr("cy", d => y(d.time_ms))
    .attr("r", 4).attr("fill", driverColors[driverName]);

  if (driverName !== "Max Verstappen") {
    g2.append("path")
      .datum(refLaps)
      .attr("fill", "none").attr("stroke", "#003773")
      .attr("stroke-dasharray", "4 2")
      .attr("stroke-width", 2)
      .attr("d", line);

    g2.selectAll(".ref-dot")
      .data(refLaps).enter()
      .append("circle")
      .attr("cx", d => x(d.lap)).attr("cy", d => y(d.time_ms))
      .attr("r", 4).attr("fill", "#003773");
  }
}
