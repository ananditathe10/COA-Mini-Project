
const $ = id => document.getElementById(id);
let addresses = [], cache = [], step = 0, hits = 0, misses = 0, cfg, rows = [];

$("method").onchange = () => {
  $("waysBox").hidden = $("method").value !== "set";
};

function message(text, error = false) {
  $("message").textContent = text;
  $("message").style.color = error ? "red" : "#6d7692";
}

function start() {
  let size = +$("size").value;
  let bs = +$("blockSize").value;
  let method = $("method").value;
  let ways = +$("ways").value;
  let raw = $("addresses").value.trim();

  if (size < 1 || bs < 1 || size % bs || !raw)
    return message("Enter valid cache size, block size and addresses.", true);

  if (!raw.split(",").every(x => /^\s*\d+\s*$/.test(x)))
    return message("Enter whole-number addresses separated by commas.", true);

  addresses = raw.split(",").map(Number);
  let n = size / bs;

  if (method === "set" && (ways < 1 || ways > n || n % ways))
    return message("Ways must divide the number of cache lines.", true);

  cfg = { bs, n, method, ways };
  cache = Array.from({ length: n }, () => ({
    block: null, tag: 0, time: 0
  }));

  step = hits = misses = 0;
  rows = [];
  $("history").innerHTML = "";
  $("next").disabled = false;
  $("cache").innerHTML = "";
  $("explain").textContent = "Cache is empty. Click Next Step.";
  message("Ready! Click Next Step to begin.");
  stats();
  draw(-1);
  progress();
}

function next() {
  if (!cfg || step >= addresses.length) return;

  let address = addresses[step];
  let block = Math.floor(address / cfg.bs);
  let candidates = [], set = 0, tag = block;

  if (cfg.method === "direct") {
    set = block % cfg.n;
    tag = Math.floor(block / cfg.n);
    candidates = [set];
  } else if (cfg.method === "full") {
    candidates = cache.map((_, i) => i);
  } else {
    let sets = cfg.n / cfg.ways;
    set = block % sets;
    tag = Math.floor(block / sets);
    candidates = Array.from(
      { length: cfg.ways }, (_, i) => set * cfg.ways + i
    );
  }

  let line = candidates.find(i => cache[i].block === block);
  let result;

  if (line !== undefined) {
    hits++;
    result = "HIT";
    cache[line].time = step + 1;
  } else {
    misses++;
    line = candidates.find(i => cache[i].block === null);

    if (line === undefined)
      line = candidates.reduce((a, b) =>
        cache[a].time < cache[b].time ? a : b
      );

    cache[line] = { block, tag, time: step + 1 };
    result = "MISS";
  }

  rows.push({ address, block, line, tag, result });
  step++;

  draw(line);
  history();
  stats();
  progress();

  $("explain").innerHTML =
    `Address <b>${address}</b> belongs to block <b>${block}</b>.<br>` +
    `Cache line: <b>${line}</b><br>` +
    `Result: <b style="color:${result === "HIT" ? "green" : "#d97706"}">CACHE ${result}</b>`;

  message(step === addresses.length
    ? "Simulation complete!"
    : "Click Next Step to continue.");

  if (step === addresses.length) $("next").disabled = true;
}

function draw(current) {
  $("cache").innerHTML = cache.map((x, i) =>
    `<div class="line ${x.block !== null ? "filled" : ""} ${i === current ? "current" : ""}">
      Line ${i}
      <strong>${x.block === null ? "Empty" : "Block " + x.block}</strong>
      <small>${x.block === null ? "Waiting for data" : "Tag: " + x.tag}</small>
    </div>`
  ).join("");
}

function history() {
  $("history").innerHTML = rows.map((r, i) =>
    `<tr>
      <td>${i + 1}</td><td>${r.address}</td><td>${r.block}</td>
      <td>${r.line}</td><td>${r.tag}</td>
      <td><span class="${r.result.toLowerCase()}">CACHE ${r.result}</span></td>
    </tr>`
  ).join("");
}

function stats() {
  $("accesses").textContent = step;
  $("hits").textContent = hits;
  $("misses").textContent = misses;
  $("rate").textContent =
    (step ? (hits / step * 100).toFixed(1) : 0) + "%";
}

function progress() {
  $("progress").textContent = `${step} / ${addresses.length} steps`;
  $("bar").style.width =
    (addresses.length ? step / addresses.length * 100 : 0) + "%";
}

function reset() {
  cfg = null;
  addresses = [];
  cache = [];
  rows = [];
  step = hits = misses = 0;

  $("next").disabled = true;
  $("cache").textContent = "Start the simulation to see cache lines.";
  $("history").innerHTML =
    '<tr><td colspan="6">Results appear here.</td></tr>';
  $("explain").textContent = "Click Start, then Next Step.";
  stats();
  progress();
  message("Reset complete. Start again when ready.");
}

$("start").onclick = start;
$("next").onclick = next;
$("reset").onclick = reset;
