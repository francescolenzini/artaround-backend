const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

const RESERVED_QUERY_KEYS = new Set(['page', 'pageSize', 'sortBy', 'sortOrder', 'q', 'queryString', 'search', 'filters']);

function toPositiveInt(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed) || parsed <= 0) {
    return fallback;
  }
  return parsed;
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function coerceScalar(value) {
  if (typeof value !== 'string') {
    return value;
  }

  const lowered = value.toLowerCase();
  if (lowered === 'true') {
    return true;
  }
  if (lowered === 'false') {
    return false;
  }
  if (lowered === 'null') {
    return null;
  }

  const asNumber = Number(value);
  if (!Number.isNaN(asNumber) && value.trim() !== '') {
    return asNumber;
  }

  return value;
}

function safeParseFilters(rawFilters) {
  if (!rawFilters || typeof rawFilters !== 'string') {
    return {};
  }

  try {
    const parsed = JSON.parse(rawFilters);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed;
    }
  } catch (_error) {
    return {};
  }

  return {};
}

function isScalarOrScalarArray(value) {
  return (
    ['string', 'number', 'boolean'].includes(typeof value) ||
    (Array.isArray(value) && value.every((item) => ['string', 'number', 'boolean'].includes(typeof item)))
  );
}

function extractFilterMap(query, { allowedFilterFields = [], ignoreFilterFields = [] } = {}) {
  const parsedFromJson = safeParseFilters(query.filters);
  const ignored = new Set(ignoreFilterFields);
  const allowed = new Set(allowedFilterFields);
  const filterMap = {};

  for (const [key, value] of Object.entries(parsedFromJson)) {
    if (allowed.has(key) && !ignored.has(key) && isScalarOrScalarArray(value)) {
      filterMap[key] = value;
    }
  }

  for (const [key, value] of Object.entries(query)) {
    if (RESERVED_QUERY_KEYS.has(key) || ignored.has(key) || !allowed.has(key) || !isScalarOrScalarArray(value)) {
      continue;
    }

    filterMap[key] = value;
  }

  return filterMap;
}

function toMongoFilterValue(value) {
  if (Array.isArray(value)) {
    return { $in: value.map((item) => coerceScalar(item)) };
  }

  if (typeof value === 'string' && value.includes(',')) {
    return { $in: value.split(',').map((item) => coerceScalar(item.trim())).filter((item) => item !== '') };
  }

  return coerceScalar(value);
}

function normalizeSortInput(sortByRaw, sortOrderRaw) {
  let by = sortByRaw;
  let order = sortOrderRaw;

  if (typeof by === 'string' && by.includes(':')) {
    const [field, direction] = by.split(':');
    by = field;
    if (!order && direction) {
      order = direction;
    }
  }

  if (typeof by === 'string' && by.startsWith('-')) {
    by = by.slice(1);
    if (!order) {
      order = 'desc';
    }
  }

  return { by, order };
}

function isSchemaSortable(model, field) {
  if (!model || !field || typeof field !== 'string') {
    return false;
  }

  const pathType = model.schema.pathType(field);
  return pathType !== 'adhocOrUndefined';
}

function buildSort({ model, sortBy, sortOrder, allowedSortFields = [], defaultSortBy = 'createdAt', defaultSortOrder = 'desc' }) {
  const normalized = normalizeSortInput(sortBy, sortOrder);
  const canUseRequestedField =
    typeof normalized.by === 'string' &&
    normalized.by.trim() !== '' &&
    (allowedSortFields.includes(normalized.by) || isSchemaSortable(model, normalized.by));

  const by = canUseRequestedField ? normalized.by : defaultSortBy;
  const order = String(normalized.order || defaultSortOrder).toLowerCase() === 'asc' ? 'asc' : 'desc';

  return {
    by,
    order,
    mongoSort: {
      [by]: order === 'asc' ? 1 : -1,
    },
  };
}

async function paginateQuery({
  model,
  req,
  baseFilter = {},
  allowedSortFields = [],
  defaultSortBy = 'createdAt',
  defaultSortOrder = 'desc',
  defaultPageSize = DEFAULT_PAGE_SIZE,
  maxPageSize = MAX_PAGE_SIZE,
  searchableFields = [],
  extraSearchConditions = [],
  ignoreFilterFields = [],
  allowedFilterFields = [],
  select,
  lean = true,
}) {
  const page = toPositiveInt(req.query.page, DEFAULT_PAGE);
  const requestedSize = toPositiveInt(req.query.pageSize, defaultPageSize);
  const pageSize = Math.min(requestedSize, maxPageSize);

  const filterMap = extractFilterMap(req.query, { allowedFilterFields, ignoreFilterFields });
  const finalFilter = { ...baseFilter };

  for (const [key, value] of Object.entries(filterMap)) {
    if (value === undefined || value === null || value === '') {
      continue;
    }

    // I vincoli imposti dalla route (tenant, stato pubblicazione, ecc.) sono
    // sempre autorevoli e non possono essere sostituiti dalla query client.
    if (Object.prototype.hasOwnProperty.call(baseFilter, key)) {
      continue;
    }

    finalFilter[key] = toMongoFilterValue(value);
  }

  const qRaw = req.query.q || req.query.queryString || req.query.search;
  const q = typeof qRaw === 'string' ? qRaw.trim() : '';
  if (q && (searchableFields.length > 0 || extraSearchConditions.length > 0)) {
    const searchFilter = {
      $or: [
      ...searchableFields.map((field) => ({
        [field]: { $regex: escapeRegex(q), $options: 'i' },
      })),
      ...extraSearchConditions,
      ],
    };
    // Non sovrascrivere un eventuale $or del baseFilter (ad esempio lo scope
    // delle activity): la ricerca deve restringere, non allargare, il risultato.
    finalFilter.$and = [...(finalFilter.$and || []), searchFilter];
  }

  const sort = buildSort({
    model,
    sortBy: req.query.sortBy,
    sortOrder: req.query.sortOrder,
    allowedSortFields,
    defaultSortBy,
    defaultSortOrder,
  });

  const skip = (page - 1) * pageSize;

  const finder = model.find(finalFilter).sort(sort.mongoSort).skip(skip).limit(pageSize);

  if (select) {
    finder.select(select);
  }

  if (lean) {
    finder.lean();
  }

  const [data, totalItems] = await Promise.all([finder.exec(), model.countDocuments(finalFilter)]);
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

  return {
    data,
    pagination: {
      page,
      pageSize,
      totalItems,
      totalPages,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1,
    },
    sort: {
      by: sort.by,
      order: sort.order,
    },
    filters: {
      ...filterMap,
      ...(q ? { q } : {}),
    },
  };
}

module.exports = {
  paginateQuery,
  escapeRegex,
};
