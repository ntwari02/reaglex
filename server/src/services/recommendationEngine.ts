export function recommendCrossSell(input: { productNames: string[] }) {
  const names = input.productNames.map((n) => n.toLowerCase()).join(' ');
  const picks: string[] = [];
  if (names.includes('laptop')) picks.push('Laptop sleeve', 'Wireless mouse');
  if (names.includes('phone')) picks.push('Fast charger', 'Screen protector');
  if (!picks.length) picks.push('Trending accessories');
  return { recommendations: picks };
}
