import { loopText } from "../components/living-g/loop-text";
const beats: [string, string[]][] = [
  ["bottom", ["welcome to", "giver"]],
  ["bottom", ["kindness as", "currency"]],
  ["middle", ["to help you", "get started..."]],
  ["bottom", ["here's", "100 sparks", "from giver"]],
  ["middle", ["50 sparks", "for you", "to wish"]],
  ["bottom", ["50 sparks", "for you", "to gift"]],
  ["top", ["so..."]],
  ["bottom", ["are you", "a giver?"]],
  ["bottom", ["meet four", "givers"]],
];
for (const [region, lines] of beats) {
  const r: any = loopText({ anchor: { x: 0, y: 0 }, region: region as any, lines });
  console.log(region, lines.join("|"), r.props.children.map((c: any) => [c.props.children, Math.round(c.props.style.fontSize)]));
}
