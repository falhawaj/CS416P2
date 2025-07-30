const svg1 = d3.select("#circuit-plot");
const svg2 = d3.select("#lap-plot");
const margin = { top: 20, right: 30, bottom: 50, left: 60 };
const width = 800 - margin.left - margin.right;
const height = 400 - margin.top - margin.bottom;

const g1 = svg1.append("g").attr("transform", `translate(${margin.left},${margin.top})`);
const g2 = svg2.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

let lapData;

d3.csv("data/lap_times.csv", d3.autoType).then(data => {
  lapData = data;

  const allCircuits = Array.from(new Set(data.map(d => d.circuit)));
  const circuitSelect = d3.select("#circuit-select");

  circuitSelect.selectAll("option")
    .data(allCircuits)
    .enter()
    .append("option")
    .text(d => d)
    .attr("value", d => d);

  d3.select("#driver-select").on("change", updateScene);
  circuitSelect.on("change", updateLapChart);

  updateScene(); // initial render
});

function updateScene() {
  const selectedDriver = d3.select("#driver-select").property("value");

  // Get fastest lap per circuit for selected driver
  const fastestLaps = d3.rollups(
    lapData.filter(d => d.driver === selectedDriver),
    v => d3.min(v, d => d.lapTime),
    d => d.circuit
  ).map(([circuit, lapTime]) => ({ circuit, lapTime }));

  // Scales
  const x = d3.scaleBand()
    .domain(fastestLaps.map(d => d.circuit))
    .range([0, width])
    .padding(0.1);

  const y = d3.scaleLinear()
    .domain([d3.min(fastestLaps, d => d.lapTime) - 1, d3.max(fastestLaps, d => d.lapTime) + 1])
    .range([height, 0]);

  g1.selectAll("*").remove();

  g1.append("g").attr("transform", `translate(0,${height})`).call(d3.axisBottom(x));
  g1.append("g").call(d3.axisLeft(y));

  // Bars
  g1.selectAll("rect")
    .data(fastestLaps)
    .enter()
    .append("rect")
    .attr("x", d => x(d.circuit))
    .attr("y", d => y(d.lapTime))
    .attr("width", x.bandwidth())
    .attr("height", d => height - y(d.lapTime))
    .attr("fill", "steelblue");

  updateLapChart(); // update second plot as well
}

function updateLapChart() {
  const selectedDriver = d3.select("#driver-select").property("value");
  const selectedCircuit = d3.select("#circuit-select").property("value");

  const driverLaps = lapData.filter(d => d.driver === selectedDriver && d.circuit === selectedCircuit);
  const verstappenLaps = lapData.filter(d => d.driver === "Verstappen" && d.circuit === selectedCircuit);

  const allLaps = driverLaps.concat(verstappenLaps);
  const maxLap = d3.max(allLaps, d => d.lap);
  const maxTime = d3.max(allLaps, d => d.lapTime);
  const minTime = d3.min(allLaps, d => d.lapTime);

  const x = d3.scaleLinear().domain([1, maxLap]).range([0, width]);
  const y = d3.scaleLinear().domain([minTime - 1, maxTime + 1]).range([height, 0]);

  g2.selectAll("*").remove();

  g2.append("g").attr("transform", `translate(0,${height})`).call(d3.axisBottom(x));
  g2.append("g").call(d3.axisLeft(y));

  // Line generator
  const line = d3.line()
    .x(d => x(d.lap))
    .y(d => y(d.lapTime));

  // Driver line
  g2.append("path")
    .datum(driverLaps)
    .attr("fill", "none")
    .attr("stroke", "steelblue")
    .attr("stroke-width", 2)
    .attr("d", line);

  // Verstappen reference line
  g2.append("path")
    .datum(verstappenLaps)
    .attr("fill", "none")
    .attr("stroke", "orange")
    .attr("stroke-dasharray", "5,5")
    .attr("stroke-width", 2)
    .attr("d", line);

  // Add legend
  g2.append("text").attr("x", width - 100).attr("y", 20).text(selectedDriver).attr("fill", "steelblue");
  g2.append("text").attr("x", width - 100).attr("y", 40).text("Verstappen").attr("fill", "orange");
}

