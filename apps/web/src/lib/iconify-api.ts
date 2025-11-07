
export const ICONIFY_HOSTS = [
  "https://api.iconify.design",
  "https://api.simplesvg.com",
  "https://api.unisvg.com",
];

let currentHost = ICONIFY_HOSTS[0];

async function fetchWithFallback(path: string): Promise<Response> {
  for (const host of ICONIFY_HOSTS) {
    try {
      const response = await fetch(`${host}${path}`, {
        signal: AbortSignal.timeout(2000),
      });
      if (response.ok) {
        currentHost = host;
        return response;
      }
    } catch (error) {
      console.warn(`Failed to fetch from ${host}:`, error);
    }
  }
  throw new Error("All API hosts failed");
}

export interface IconSet {
  prefix: string;
  name: string;
  total: number;
  author?: {
    name: string;
    url?: string;
  };
  license?: {
    title: string;
    spdx?: string;
    url?: string;
  };
  samples?: string[];
  category?: string;
  palette?: boolean;
}

export interface IconSearchResult {
  icons: string[];
  total: number;
  limit: number;
  start: number;
  collections: Record<string, IconSet>;
}

export interface CollectionInfo {
  prefix: string;
  total: number;
  title?: string;
  uncategorized?: string[];
  categories?: Record<string, string[]>;
  hidden?: string[];
  aliases?: Record<string, string>;
}

export async function getCollections(
  category?: string
): Promise<Record<string, IconSet>> {
  try {
    const response = await fetchWithFallback("/collections?pretty=1");
    const data = (await response.json()) as Record<string, IconSet>;

    if (category) {
      const filtered = Object.fromEntries(
        Object.entries(data).filter(
          ([_key, info]) => info.category === category
        )
      ) as Record<string, IconSet>;
      return filtered;
    }

    return data;
  } catch (error) {
    console.error("Failed to fetch collections:", error);
    return {};
  }
}

export async function getCollection(
  prefix: string
): Promise<CollectionInfo | null> {
  try {
    const response = await fetchWithFallback(
      `/collection?prefix=${prefix}&pretty=1`
    );
    return await response.json();
  } catch (error) {
    console.error(`Failed to fetch collection ${prefix}:`, error);
    return null;
  }
}

export async function searchIcons(
  query: string,
  limit: number = 64,
  prefixes?: string[],
  category?: string
): Promise<IconSearchResult> {
  const params = new URLSearchParams({
    query,
    limit: limit.toString(),
    pretty: "1",
  });

  if (prefixes?.length) {
    params.append("prefixes", prefixes.join(","));
  }

  if (category) {
    params.append("category", category);
  }

  try {
    const response = await fetchWithFallback(`/search?${params}`);
    return await response.json();
  } catch (error) {
    console.error("Failed to search icons:", error);
    return {
      icons: [],
      total: 0,
      limit,
      start: 0,
      collections: {},
    };
  }
}

export function buildIconSvgUrl(
  host: string,
  iconName: string,
  params?: {
    color?: string;
    width?: number;
    height?: number;
    flip?: "horizontal" | "vertical" | "horizontal,vertical";
    rotate?: number | string;
  }
): string {
  const [prefix, name] = iconName.includes(":")
    ? iconName.split(":")
    : ["", iconName];

  if (!prefix || !name) {
    throw new Error('Invalid icon name format. Expected "prefix:name"');
  }

  const urlParams = new URLSearchParams();

  if (params?.color) {
    urlParams.append("color", params.color.replace("#", "%23"));
  }

  if (params?.width) {
    urlParams.append("width", params.width.toString());
  }

  if (params?.height) {
    urlParams.append("height", params.height.toString());
  }

  if (params?.flip) {
    urlParams.append("flip", params.flip);
  }

  if (params?.rotate) {
    urlParams.append("rotate", params.rotate.toString());
  }

  const queryString = urlParams.toString();
  return `${host}/${prefix}/${name}.svg${queryString ? "?" + queryString : ""}`;
}

export function getIconSvgUrl(
  iconName: string,
  params?: Parameters<typeof buildIconSvgUrl>[2]
): string {
  return buildIconSvgUrl(currentHost, iconName, params);
}

export async function downloadSvgAsText(
  iconName: string,
  params?: Parameters<typeof getIconSvgUrl>[1]
): Promise<string> {
  const url = getIconSvgUrl(iconName, params);
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download SVG: ${response.statusText}`);
  }
  return await response.text();
}

export function svgToFile(svgText: string, fileName: string): File {
  const blob = new Blob([svgText], { type: "image/svg+xml" });
  return new File([blob], fileName, { type: "image/svg+xml" });
}

export const POPULAR_COLLECTIONS = {
  general: [
    { prefix: "mdi", name: "Material Design Icons" },
    { prefix: "ic", name: "Google Material Icons" },
    { prefix: "ph", name: "Phosphor" },
    { prefix: "heroicons", name: "Heroicons" },
    { prefix: "lucide", name: "Lucide" },
    { prefix: "tabler", name: "Tabler Icons" },
    { prefix: "fe", name: "Feather Icons" },
    { prefix: "bi", name: "Bootstrap Icons" },
  ],
  brands: [
    { prefix: "simple-icons", name: "Simple Icons" },
    { prefix: "logos", name: "SVG Logos" },
    { prefix: "skill-icons", name: "Skill Icons" },
    { prefix: "devicon", name: "Devicon" },
    { prefix: "fa-brands", name: "Font Awesome Brands" },
  ],
  emoji: [
    { prefix: "noto", name: "Noto Emoji" },
    { prefix: "twemoji", name: "Twemoji" },
    { prefix: "fluent-emoji", name: "Fluent Emoji" },
    { prefix: "fluent-emoji-flat", name: "Fluent Emoji Flat" },
    { prefix: "emojione", name: "EmojiOne" },
    { prefix: "openmoji", name: "OpenMoji" },
  ],
};

export function getCategoriesFromCollections(
  collections: Record<string, IconSet>
): string[] {
  const categories = new Set<string>();
  Object.values(collections).forEach((collection) => {
    if (collection.category) {
      categories.add(collection.category);
    }
  });
  return Array.from(categories).sort();
}
