let allLapData = [], fastestLaps = [];
const svg1 = d3.select("#primary");
const svg2 = d3.select("#secondary");

const driverColors = {
  "Max Verstappen": "#003773",
  "Sergio Pérez": "#E30118",
  "Lewis Hamilton": "#565F64",
  "Fernando Alonso": "#229971"
};

function fixPerez(row) {
  if (row.driverName === "Sergio PÃ©rez") row.driverName = "Sergio Pérez";
  return row;
}

Promise.all([
  d3.csv("lap_times_with_names.csv", d3.autoType).then(d => d.map(fixPerez)),
  d3.csv("min_lap_times_with_names.csv", d3.autoType).then(d => d.map(fixPerez))
]).then(([lapData, minData]) => {
  allLapData = lapData;
  fastestLaps = minData;
  loadDriver("Max Verstappen"); // ✅ Default view
});

function loadDriver(driverName) {
  d3.select("#main-title").text(
    driverName === "Max Verstappen"
      ? "Fastest Lap Time vs. Circuit"
      : `Difference in Fastest Lap vs. Circuit (Compared to Verstappen)`
  );
  renderPrimaryPlot(driverName);
  svg2.classed("hidden", true);
}

function renderPrimaryPlot(driverName) {
  svg1.html("");
  const margin = { top: 70, right: 40, bottom: 120, left: 80 };
  const width = +svg1.attr("width") - margin.left - margin.right;
  const height = +svg1.attr("height") - margin.top - margin.bottom;

  const g = svg1.append("g").attr("transform", `translate(${margin.left},${margin.top})`);
  const driverLaps = fastestLaps.filter(d => d.driverName === driverName);
  const verstappenLaps = fastestLaps.filter(d => d.driverName === "Max Verstappen");

  const circuits = driverLaps.map(d => d.circuitName.replace(" Grand Prix", ""));
  const x = d3.scalePoint().domain(circuits).range([0, width]).padding(0.5);

  let processedData;
  let yLabel;
  let y;

  if (driverName === "Max Verstappen") {
    yLabel = "Fastest Lap Time (ms)";
    const yDomain = d3.extent(driverLaps, d => d.time_ms);
    y = d3.scaleLinear().domain(yDomain).range([height, 0]);
    processedData = driverLaps.map(d => ({
      circuit: d.circuitName.replace(" Grand Prix", ""),
      fullName: d.circuitName,
      time_ms: d.time_ms
    }));
  } else {
    yLabel = "Lap Time Difference from Verstappen (ms)";
    processedData = driverLaps.map(d => {
      const ref = verstappenLaps.find(v => v.raceId === d.raceId);
      return {
        circuit: d.circuitName.replace(" Grand Prix", ""),
        fullName: d.circuitName,
        time_ms: ref ? d.time_ms - ref.time_ms : null
      };
    }).filter(d => d.time_ms !== null);
    const yDomain = d3.extent(processedData, d => d.time_ms);
    y = d3.scaleLinear().domain([yDomain[0] * 0.98, yDomain[1] * 1.02]).range([height, 0]);
  }

  // Axes
  g.append("g")
    .attr("transform", `translate(0,${height})`)
    .call(d3.axisBottom(x))
    .selectAll("text")
    .attr("transform", "rotate(-45)")
    .style("text-anchor", "end")
    .on("click", (event, d) => showLapPlot(driverName, d + " Grand Prix"));

  g.append("g").call(d3.axisLeft(y));

  // Axis Labels
  g.append("text")
    .attr("x", width / 2)
    .attr("y", height + 80)
    .attr("text-anchor", "middle")
    .text("Grand Prix");

  g.append("text")
    .attr("x", -height / 2)
    .attr("y", -60)
    .attr("transform", "rotate(-90)")
    .attr("text-anchor", "middle")
    .text(yLabel);

  // Line
  const line = d3.line()
    .x(d => x(d.circuit))
    .y(d => y(d.time_ms));

  g.append("path")
    .datum(processedData)
    .attr("fill", "none")
    .attr("stroke", driverColors[driverName])
    .attr("stroke-width", 2)
    .attr("d", line);

  // Dots
  g.selectAll("circle")
    .data(processedData)
    .enter()
    .append("circle")
    .attr("cx", d => x(d.circuit))
    .attr("cy", d => y(d.time_ms))
    .attr("r", 4)
    .attr("fill", driverColors[driverName])
    .on("click", d => showLapPlot(driverName, d.fullName));

  // Verstappen Reference Line (for others)
  if (driverName !== "Max Verstappen") {
    const baseline = processedData.map(d => ({ circuit: d.circuit, time_ms: 0 }));
    g.append("path")
      .datum(baseline)
      .attr("fill", "none")
      .attr("stroke", driverColors["Max Verstappen"])
      .attr("stroke-width", 2)
      .attr("stroke-dasharray", "4 2")
      .attr("d", d3.line().x(d => x(d.circuit)).y(d => y(d.time_ms)));
  }

  // Legend
  const legend = svg1.append("g")
    .attr("transform", `translate(${margin.left + 20},20)`);

  legend.append("line")
    .attr("x1", 0).attr("y1", 0).attr("x2", 30).attr("y2", 0)
    .attr("stroke", driverColors[driverName])
    .attr("stroke-width", 2);
  legend.append("circle")
    .attr("cx", 15).attr("cy", 0).attr("r", 4)
    .attr("fill", driverColors[driverName]);
  legend.append("text")
    .attr("x", 40).attr("y", 5)
    .text(driverName);

  if (driverName !== "Max Verstappen") {
    legend.append("line")
      .attr("x1", 0).attr("y1", 20).attr("x2", 30).attr("y2", 20)
      .attr("stroke", "#003773").attr("stroke-width", 2)
      .attr("stroke-dasharray", "4 2");
    legend.append("circle")
      .attr("cx", 15).attr("cy", 20).attr("r", 4)
      .attr("fill", "#003773");
    legend.append("text")
      .attr("x", 40).attr("y", 25)
      .text("Max Verstappen");
  }

  // === Annotations ===
  const annotations = {
    "Max Verstappen": { circuit: "Dutch", label: "Verstappen’s home race" },
    "Sergio Pérez": { circuit: "Mexico City", label: "Pérez’s home race" },
    "Lewis Hamilton": { circuit: "British", label: "Hamilton’s home country" },
    "Fernando Alonso": { circuit: "Spanish", label: "Alonso’s home country" }
  };
  const note = annotations[driverName];
  if (note) {
    const pt = processedData.find(d => d.circuit.includes(note.circuit));
    if (pt) {
      const makeAnnotation = d3.annotation()
        .type(d3.annotationLabel)
        .annotations([{
          note: { label: note.label, title: pt.circuit },
          x: x(pt.circuit),
          y: y(pt.time_ms),
          dy: -40,
          dx: 0
        }]);
      g.append("g").call(makeAnnotation);
    }
  }
}

function showLapPlot(driverName, circuitName) {
  svg2.classed("hidden", false).html("");

  const margin = { top: 60, right: 30, bottom: 60, left: 70 };
  const width = +svg2.attr("width") - margin.left - margin.right;
  const height = +svg2.attr("height") - margin.top - margin.bottom;

  const g = svg2.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

  const laps = allLapData.filter(d => d.circuitName === circuitName);
  const driverLaps = laps.filter(d => d.driverName === driverName);
  const refLaps = laps.filter(d => d.driverName === "Max Verstappen");

  const all = driverLaps.concat(refLaps);
  const x = d3.scaleLinear().domain(d3.extent(all, d => d.lap)).range([0, width]);
  const y = d3.scaleLinear().domain(d3.extent(all, d => d.time_ms)).range([height, 0]);

  g.append("g").attr("transform", `translate(0,${height})`).call(d3.axisBottom(x));
  g.append("g").call(d3.axisLeft(y));

  // Labels
  g.append("text").attr("x", width / 2).attr("y", -30).attr("text-anchor", "middle")
    .text(`Lap Time vs. Lap for ${circuitName}`);
  g.append("text").attr("x", width / 2).attr("y", height + 40).attr("text-anchor", "middle")
    .text("Lap");
  g.append("text").attr("x", -height / 2).attr("y", -50)
    .attr("transform", "rotate(-90)").attr("text-anchor", "middle")
    .text("Lap Time");

  const line = d3.line().x(d => x(d.lap)).y(d => y(d.time_ms));

  g.append("path")
    .datum(driverLaps)
    .attr("fill", "none")
    .attr("stroke", driverColors[driverName])
    .attr("stroke-width", 2)
    .attr("d", line);

  g.selectAll(".dot")
    .data(driverLaps)
    .enter().append("circle")
    .attr("cx", d => x(d.lap))
    .attr("cy", d => y(d.time_ms))
    .attr("r", 3)
    .attr("fill", driverColors[driverName]);

  if (driverName !== "Max Verstappen") {
    g.append("path")
      .datum(refLaps)
      .attr("fill", "none")
      .attr("stroke", "#003773")
      .attr("stroke-width", 2)
      .attr("stroke-dasharray", "4 2")
      .attr("d", line);
    g.selectAll(".refDot")
      .data(refLaps)
      .enter().append("circle")
      .attr("cx", d => x(d.lap))
      .attr("cy", d => y(d.time_ms))
      .attr("r", 3)
      .attr("fill", "#003773");
  }
}
