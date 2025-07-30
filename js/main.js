const svg1 = d3.select("#circuit-plot");
const svg2 = d3.select("#lap-plot");

const margin = { top: 20, right: 30, bottom: 50, left: 60 };
const width = 800 - margin.left - margin.right;
const height = 400 - margin.top - margin.bottom;

const g1 = svg1.append("g").attr("transform", `translate(${margin.left},${margin.top})`);
const g2 = svg2.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

let fastestLapData, allLapData;

Promise.all([
  d3.csv("data/min_lap_times_with_names.csv", d3.autoType),
  d3.csv("data/lap_times_with_names.csv", d3.autoType)
]).then(([fastest, all]) => {
  fastestLapData = fastest;
  allLapData = all;

  d3.select("#driver-select").on("change", updateScene);
  updateScene();
});

function updateScene() {
  const selectedDriver = d3.select("#driver-select").property("value");
  
  const driverFastest = fastestLapData.filter(d => d.driver === selectedDriver);
  
  const x = d3.scaleBand()
    .domain(driverFastest.map(d => d.circuit))
    .range([0, width])
    .padding(0.1);
  
  const y = d3.scaleLinear()
    .domain([d3.min(driverFastest, d => d.fastestLap) - 1, d3.max(driverFastest, d => d.fastestLap) + 1])
    .range([height, 0]);
  
  g1.selectAll("*").remove();
  
  g1.append("g").attr("transform", `translate(0,${height})`).call(d3.axisBottom(x));
  g1.append("g").call(d3.axisLeft(y));
  
  g1.selectAll("rect")
    .data(driverFastest)
    .enter()
    .append("rect")
    .attr("x", d => x(d.circuit))
    .attr("y", d => y(d.fastestLap))
    .attr("width", x.bandwidth())
    .attr("height", d => height - y(d.fastestLap))
    .attr("fill", "steelblue")
    .style("cursor", "pointer")
    .on("click", (event, d) => {
      showLapPlot(selectedDriver, d.circuit);
    });
  
  // Clear lap plot initially
  g2.selectAll("*").remove();
}

function showLapPlot(driver, circuit) {
  const driverLaps = allLapData.filter(d => d.driver === driver && d.circuit === circuit);
  const verstappenLaps = allLapData.filter(d => d.driver === "Verstappen" && d.circuit === circuit);

  const allLaps = driverLaps.concat(verstappenLaps);
  const maxLap = d3.max(allLaps, d => d.lap);
  const maxTime = d3.max(allLaps, d => d.lapTime);
  const minTime = d3.min(allLaps, d => d.lapTime);
  
  const x = d3.scaleLinear().domain([1, maxLap]).range([0, width]);
  const y = d3.scaleLinear().domain([minTime - 1, maxTime + 1]).range([height, 0]);
  
  g2.selectAll("*").remove();
  
  g2.append("g").attr("transform", `translate(0,${height})`).call(d3.axisBottom(x).ticks(maxLap));
  g2.append("g").call(d3.axisLeft(y));
  
  const line = d3.line()
    .x(d => x(d.lap))
    .y(d => y(d.lapTime));
  
  g2.append("path")
    .datum(driverLaps)
    .attr("fill", "none")
    .attr("stroke", "steelblue")
    .attr("stroke-width", 2)
    .attr("d", line);
  
  g2.append("path")
    .datum(verstappenLaps)
    .attr("fill", "none")
    .attr("stroke", "orange")
    .attr("stroke-dasharray", "5,5")
    .attr("stroke-width", 2)
    .attr("d", line);
  
  g2.append("text")
    .attr("x", width - 120)
    .attr("y", 20)
    .text(driver)
    .attr("fill", "steelblue");
  
  g2.append("text")
    .attr("x", width - 120)
    .attr("y", 40)
    .text("Verstappen")
    .attr("fill", "orange");
}
