export function capitalize(input: string): string {
  return !input ? input : input.charAt(0).toUpperCase() + input.slice(1).toLowerCase();
}

export function CamelCase(input: string): string {
  return input
    .split(/[-_]+/)
    .map((part) => capitalize(part))
    .join('');
}

export function camelCase(input: string): string {
  return input
    .split(/[-_]+/)
    .map((part, idx) => (idx ? capitalize(part) : part.toLowerCase()))
    .join('');
}
