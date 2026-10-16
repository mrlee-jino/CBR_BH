import { barangays, properties, unitTypes } from "./data";

export type SearchParams = Record<string, string | string[] | undefined>;
export type Filters = {
  q: string;
  area: string;
  type: string;
  min: string;
  max: string;
  sort: string;
};

export function searchProperties(params: SearchParams) {
  const read = (name: string) => {
    const value = params[name];
    return (Array.isArray(value) ? value[0] : value)?.trim() ?? "";
  };
  const budget = (name: string) => {
    const value = read(name);
    return /^\d{1,7}$/.test(value) ? value : "";
  };
  const filters: Filters = {
    q: read("q").slice(0, 100),
    area: barangays.includes(read("area")) ? read("area") : "",
    type: unitTypes.some((type) => type.value === read("type")) ? read("type") : "",
    min: budget("min"),
    max: budget("max"),
    sort: ["price-asc", "price-desc", "name"].includes(read("sort")) ? read("sort") : "featured",
  };
  const errors: string[] = [];
  if ((read("min") && !filters.min) || (read("max") && !filters.max)) {
    errors.push("Enter a monthly budget using whole pesos between 0 and 9,999,999.");
  }
  if (filters.min && filters.max && Number(filters.min) > Number(filters.max)) {
    errors.push("Your minimum monthly budget must be less than or equal to your maximum.");
  }
  if (errors.length) return { filters, errors, results: [] };

  const results = properties.filter((property) => {
    const words = filters.q.toLowerCase().split(/\s+/).filter(Boolean);
    const searchable =
      `${property.name} ${property.barangay} ${property.description} ${property.amenities.join(" ")}`.toLowerCase();
    return (
      words.every((word) => searchable.includes(word)) &&
      (!filters.area || property.barangay === filters.area) &&
      (!filters.type || property.type === filters.type) &&
      (!filters.min || property.price >= Number(filters.min)) &&
      (!filters.max || property.price <= Number(filters.max))
    );
  });
  if (filters.sort === "price-asc") results.sort((a, b) => a.price - b.price);
  if (filters.sort === "price-desc") results.sort((a, b) => b.price - a.price);
  if (filters.sort === "name") results.sort((a, b) => a.name.localeCompare(b.name));
  return { filters, errors, results };
}

export const emptyFilters: Filters = {
  q: "",
  area: "",
  type: "",
  min: "",
  max: "",
  sort: "featured",
};
