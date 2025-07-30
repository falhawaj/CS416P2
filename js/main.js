const svg1 = d3.select("#circuit-plot");
const svg2 = d3.select("#lap-plot");
const lapPlotContainer = d3.select("#lap-plot-container");

const margin = { top: 20, right: 30, bottom: 50, left: 60 };
const width = 800 - margin.left - margin.right;
const height = 400 - margin.top - margin.bottom;

const g1 = svg1.append("g").attr("transform", `translate(${margin.left},${margin.top})`);
const g2 = svg2.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

let minLapData, allLapData;

Promise.all([
  d3.csv("data/min_lap_times_with_names.csv", d3.autoType),
  d3.csv("data/lap_times_with_names.csv", d3.autoType)
]).then(([minData, allData]) => {
  minLapData = minData;
  allLapData = allData;

  d3.select("#driver-select").on("change", updateScene);
  updateScene(); // initial render
});

function updateScene() {
  const selectedDriver = d3.select("#driver-select").property("value");

  // Filter min lap data for that driver
  const driverMinLaps = minLapData.filter(d => d.driverName === selectedDriver);

  if (driverMinLaps.length === 0) {
    console.warn(`No data for ${selectedDriver}`);
    return;
  }

  const circuits = driverMinLaps.map(d => d.circuitName);

  const x = d3.scalePoint()
    .domain(circuits)
    .range([0, width])
    .padding(0.5);

  const y = d3.scaleLinear()
    .domain([
      d3.min(driverMinLaps, d => d.time_ms) - 1000,
      d3.max(driverMinLaps, d => d.time_ms) + 1000
    ])
    .range([height, 0]);

  g1.selectAll("*").remove();

  // Axes
  g1.append("g")
    .attr("transform", `translate(0,${height})`)
    .call(d3.axisBottom(x))
    .selectAll("text")
    .style("cursor", "pointer")
    .on("click", (_, circuit) => showLapPlot(selectedDriver, circuit))
    .on("mouseover", (_, circuit) => showLapPlot(selectedDriver, circuit));

  g1.append("g").call(d3.axisLeft(y));

  // Dots
  g1.selectAll("circle")
    .data(driverMinLaps)
    .enter()
    .append("circle")
    .attr("cx", d => x(d.circuitName))
    .attr("cy", d => y(d.time_ms))
    .attr("r", 5)
    .attr("fill", "steelblue")
    .on("click", (_, d) => showLapPlot(selectedDriver, d.circuitName))
    .on("mouseover", (_, d) => showLapPlot(selectedDriver, d.circuitName));

  // Connecting dashed line
  const line = d3.line()
    .x(d => x(d.circuitName))
    .y(d => y(d.time_ms));

  g1.append("path")
    .datum(driverMinLaps)
    .attr("fill", "none")
    .attr("stroke", "steelblue")
    .attr("stroke-dasharray", "5,5")
    .attr("stroke-width", 1.5)
    .attr("d", line);

  // Hide lap plot until user interacts
  lapPlotContainer.classed("hidden", true);
}

function showLapPlot(driverName, circuitName) {
  lapPlotContainer.classed("hidden", false);

  const driverLaps = allLapData.filter(d => d.driverName === driverName && d.circuitName === circuitName);
  const verstappenLaps = allLapData.filter(d => d.driverName === "Max Verstappen" && d.circuitName === circuitName);

  const allLaps = driverLaps.concat(verstappenLaps);
  const maxLap = d3.max(allLaps, d => d.lap);
  const minTime = d3.min(allLaps, d => d.time_ms);
  const maxTime = d3.max(allLaps, d => d.time_ms);

  const x = d3.scaleLinear().domain([1, maxLap]).range([0, width]);
  const y = d3.scaleLinear().domain([minTime - 1000, maxTime + 1000]).range([height, 0]);

  g2.selectAll("*").remove();

  g2.append("g").attr("transform", `translate(0,${height})`).call(d3.axisBottom(x));
  g2.append("g").call(d3.axisLeft(y));

  const line = d3.line()
    .x(d => x(d.lap))
    .y(d => y(d.time_ms));

  // Driver
  g2.append("path")
    .datum(driverLaps)
    .attr("fill", "none")
    .attr("stroke", "steelblue")
    .attr("stroke-dasharray", "4,2")
    .attr("stroke-width", 2)
    .attr("d", line);

  g2.selectAll("circle.driver")
    .data(driverLaps)
    .enter()
    .append("circle")
    .attr("class", "driver")
    .attr("cx", d => x(d.la
