function row(s) {
  if (s.length !== 40) throw new Error(`${s.length}: ${s}`);
  return s;
}

const map = [
  row("########################################"),
  row("#~~~~~&&...&#####B#####&&.&.&&....~~~~~#"),
  row("#~~~~~.&&...#...=...#....&&.......~~~~~#"),
  row("#~~~~~......#...=...#.............~~~~~#"),
  row("#~~~~~.######...=...#######.......~~~~~#"),
  row("#~~~~~.#H.vv#=======#.tt.H#.......~~~~~#"),
  row("#~~~~~.#...A=========M....#.......~~~~~#"),
  row("#~~~~~.#H.b.#.......#.k..H#.......~~~~~#"),
  row("#~~~~~.######=======#######.......~~~~~#"),
  row("#~~~~~......===========...........~~~~~#"),
  row("#~~~~~..HSSSS========HH...........~~~~~#"),
  row("#~~~~~..cbg!hty$=====q............~~~~~#"),
  row("#~~~~~..vvbjjjl========...........~~~~~#"),
  row("#~~~~~.........z======Huf.........~~~~~#"),
  row("#~~~~#T#==================........~~~~~#"),
  row("#~~~~~........@=========o....&&...~~~~~#"),
  row("#~~~~~.........===========....&&...~~~~~#"),
  // 市井南：衙门·酒楼·花舫·医馆 — 完整院墙，门朝北通路
  row("#~~~~~..#####J#P#U#K#####.....&&...~~~~~#"),
  row("#~~~~~..#H...........H..#........~~~~~#"),
  row("#~~~~~..#################........~~~~~#"),
  row("#~~~~~.........===========........~~~~~#"),
  // 港务：缆厂·灯楼 — 完整院墙
  row("#~~~~~..#######N###O#####........~~~~~#"),
  row("#~~~~~..#H.drr.1.....H..#........~~~~~#"),
  row("#~~~~~..#################........~~~~~#"),
  row("#~~~~~....................~~~~....~~~~~#"),
  row("#~~~~~..p.m.i.C..........~~~~~~...~~~~~#"),
  row("#~~~~~..~~~~~~~~~~~~~~~~~~~~......~~~~~#"),
  row("#~~~~~.~~~~~~~~~~~~~~~~~~~~~.&....~~~~~#"),
  row("########################################"),
];

map.forEach((r, i) => console.log(String(i).padStart(2), r));

const roads = [];
for (let y = 0; y < map.length; y++) {
  for (let x = 0; x < 40; x++) if (map[y][x] === "=") roads.push({ x, y });
}
const seen = new Set([`${roads[0].x},${roads[0].y}`]);
const q = [roads[0]];
for (let i = 0; i < q.length; i++) {
  const { x, y } = q[i];
  for (const [dx, dy] of [
    [0, 1],
    [0, -1],
    [1, 0],
    [-1, 0],
  ]) {
    const nx = x + dx,
      ny = y + dy,
      k = `${nx},${ny}`;
    if (seen.has(k) || map[ny]?.[nx] !== "=") continue;
    seen.add(k);
    q.push({ x: nx, y: ny });
  }
}
console.log("roads", seen.size, "/", roads.length);
for (const r of roads) if (!seen.has(`${r.x},${r.y}`)) console.log("orphan", r);

function frame(x, y) {
  const h = map.length;
  const rim = (nx, ny) => nx === 0 || ny === 0 || nx === 39 || ny === h - 1;
  for (const [dx, dy] of [
    [0, -1],
    [0, 1],
    [-1, 0],
    [1, 0],
  ]) {
    const nx = x + dx,
      ny = y + dy;
    if (map[ny]?.[nx] === "#" && !rim(nx, ny)) return true;
  }
  return false;
}

for (const ch of "ABMJPUKNOT") {
  for (let y = 0; y < map.length; y++) {
    for (let x = 0; x < 40; x++) {
      if (map[y][x] === ch) {
        console.log(ch, x, y, "frame", frame(x, y), "above", map[y - 1][x]);
      }
    }
  }
}

const need = ["A", "B", "M", "N", "O", "T", "J", "P", "U", "K", "@", "1", "k", "q", "c", "h", "y", "u", "d", "z", "g", "i", "$", "!", "m", "f", "o", "C"];
for (const ch of need) {
  let n = 0;
  for (const r of map) for (const c of r) if (c === ch) n++;
  if (n !== 1) console.log("bad count", ch, n);
}
