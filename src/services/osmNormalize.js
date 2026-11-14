import { CATEGORIES } from "../lib/categories.js";

/**
 * Converts raw OpenStreetMap elements (node/way/relation) into the app's
 * uniform feature shape:
 *
 *   { id, osmType, category, geometryType, name, tags, coordinates: [lon, lat] }
 *
 * Classification MECHANISMS live here (code); the SET of categories and
 * their tag mappings come from the registry in lib/categories.js.
 */

export function normalizeOsmElements(elements) {
  // Create lookup Maps once
  const nodesById = createNodesMap(elements);
  const waysById = createWaysMap(elements);

  return elements
    .map((element) => {
      if (element.type === "relation") {
        return normalizeRelation(
          element,
          waysById,
          nodesById
        );
      }

      return normalizeOsmElement(element);
    })
    .filter((element) => element !== null);
}

export function isArea(tags) {
  return Boolean(
    tags.building ||
    tags.landuse ||
    (tags.amenity &&
      CATEGORIES.some(
        (category) => category.areaAmenity && category.id === tags.amenity
      ))
  );
}

function createNodesMap(elements) {
  const nodes = elements.filter(
    (element) => element.type === "node"
  );

  return new Map(
    nodes.map((node) => [node.id, node])
  );
}

function getWayCoordinates(way, nodesById) {
  const coordinates = way.nodes.map((nodeId) => {
    const node = nodesById.get(nodeId);

    if (!node) {
      return null;
    }

    return [node.lon, node.lat];
  });

  if (coordinates.includes(null)) {
    return null;
  }

  return coordinates;
}

function createWaysMap(elements) {
  const ways = elements.filter(
    (element) => element.type === "way"
  );

  return new Map(
    ways.map((way) => [way.id, way])
  );
}

function normalizeRelation(relation, waysById, nodesById) {
  if (relation.tags?.type !== "multipolygon") {
    return null;
  }

  const outerMembers = relation.members.filter(
    (member) => member.role === "outer"
  );

  const outerRings = outerMembers.map((member) => {
    const way = waysById.get(member.ref);

    if (!way) {
      return null;
    }

    const coordinates = getWayCoordinates(way, nodesById);

    if (!coordinates || coordinates.length < 4) {
      return null;
    }

    const first = coordinates[0];
    const last = coordinates[coordinates.length - 1];

    const isClosed =
      first[0] === last[0] &&
      first[1] === last[1];

    if (!isClosed) {
      return null;
    }

    return coordinates;
  });

  if (outerRings.includes(null) || outerRings.length === 0) {
    return null;
  }

  return {
    id: `relation/${relation.id}`,
    osmType: "relation",
    category: relation.tags?.landuse ? "landuse" : "unknown",
    geometryType:
      outerRings.length === 1 ? "Polygon" : "MultiPolygon",
    name: relation.tags?.name ?? null,
    tags: relation.tags,
    coordinates:
      outerRings.length === 1
        ? outerRings
        : outerRings.map((ring) => [ring]),
  };
}

function getAreaCategory(tags) {
  // Precedence = registry order: building before landuse before amenity.
  const areaCategory = CATEGORIES.find(
    (category) => category.areaTag && tags[category.areaTag]
  );

  return areaCategory ? areaCategory.id : "unknown";
}

function getNodeCategory(tags) {
  const amenityCategory = CATEGORIES.find(
    (category) => category.amenityValue && category.id === tags?.amenity
  );

  if (amenityCategory) {
    return amenityCategory.id;
  }

  const highwayCategory = CATEGORIES.find(
    (category) =>
      category.highwayValue && category.highwayValue === tags?.highway
  );

  return highwayCategory ? highwayCategory.id : null;
}

export function normalizeOsmElement(element) {
  // Handle Nodes
  if (element.type === "node") {
    const category = getNodeCategory(element.tags);

    if (!category) {
      return null;
    }

    if (
      !Number.isFinite(element.lat) ||
      !Number.isFinite(element.lon)
    ) {
      return null;
    }

    return {
      id: `${element.type}/${element.id}`,
      osmType: element.type,
      category,
      geometryType: "Point",
      name: element.tags.name ?? null,
      tags: element.tags,
      coordinates: [element.lon, element.lat],
    };
  }

  if (element.type !== "way") {
    return null;
  }

  if (!element.geometry || element.geometry.length < 2) {
    return null;
  }

  const firstPoint = element.geometry[0];
  const lastPoint = element.geometry[element.geometry.length - 1];

  const isClosed =
    firstPoint.lat === lastPoint.lat &&
    firstPoint.lon === lastPoint.lon;

  // Area (closed ring with an area category tag)
  if (isArea(element.tags) && isClosed) {
    return {
      id: `${element.type}/${element.id}`,
      osmType: element.type,
      category: getAreaCategory(element.tags),
      geometryType: "Polygon",
      name: element.tags.name ?? null,
      tags: element.tags,
      coordinates: [
        element.geometry.map((point) => [
          point.lon,
          point.lat,
        ]),
      ],
    };
  }

  // Road (open way with a highway tag)
  if (element.tags?.highway && !isClosed) {
    return {
      id: `${element.type}/${element.id}`,
      osmType: element.type,
      category: "road",
      geometryType: "LineString",
      name: element.tags.name ?? null,
      tags: element.tags,
      coordinates: element.geometry.map((point) => [
        point.lon,
        point.lat,
      ]),
    };
  }

  return null;
}
