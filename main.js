import './main.css';

async function run() {
  const part1 = await import('./part1');
  const part2 = await import('./part2');

  console.log(part1, part2);
}

run();
