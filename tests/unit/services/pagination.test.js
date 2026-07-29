const mongoose = require('mongoose');

const { buildTestApp } = require('../../testUtils/appFactory');
const { clearDatabase, disconnectDatabase } = require('../../testUtils/dbHelpers');
const { stopInMemoryMongo } = require('../../testUtils/mongoServer');
const { paginateQuery } = require('../../../app/src/services/pagination');

const paginationEntitySchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    category: { type: String, required: true },
    rank: { type: Number, required: true },
  },
  { timestamps: true, versionKey: false }
);

const PaginationEntity =
  mongoose.models.PaginationEntity || mongoose.model('PaginationEntity', paginationEntitySchema);

describe('pagination service', () => {
  beforeAll(async () => {
    await buildTestApp();
  });

  afterEach(async () => {
    await clearDatabase();
  });

  afterAll(async () => {
    await disconnectDatabase();
    await stopInMemoryMongo();
  });

  it('applies sort alias and queryString search alias', async () => {
    await PaginationEntity.insertMany([
      { name: 'Alpha City', category: 'north', rank: 20 },
      { name: 'Beta Town', category: 'south', rank: 10 },
      { name: 'Gamma Place', category: 'north', rank: 30 },
    ]);

    const req = {
      query: {
        page: '1',
        pageSize: '10',
        sortBy: '-rank',
        queryString: 'a',
      },
    };

    const result = await paginateQuery({
      model: PaginationEntity,
      req,
      searchableFields: ['name'],
      defaultSortBy: 'createdAt',
      defaultSortOrder: 'desc',
    });

    expect(result.sort).toEqual({ by: 'rank', order: 'desc' });
    expect(result.filters.q).toBe('a');
    expect(result.data.map((item) => item.rank)).toEqual([30, 20, 10]);
  });

  it('supports filters json and query filters together', async () => {
    await PaginationEntity.insertMany([
      { name: 'North One', category: 'north', rank: 1 },
      { name: 'North Two', category: 'north', rank: 2 },
      { name: 'South One', category: 'south', rank: 3 },
    ]);

    const req = {
      query: {
        page: '1',
        pageSize: '5',
        filters: JSON.stringify({ category: 'north' }),
        rank: '2',
      },
    };

    const result = await paginateQuery({
      model: PaginationEntity,
      req,
      defaultSortBy: 'rank',
      defaultSortOrder: 'asc',
      allowedFilterFields: ['category', 'rank'],
    });

    expect(result.pagination.totalItems).toBe(1);
    expect(result.data[0].name).toBe('North Two');
    expect(result.filters.category).toBe('north');
    expect(result.filters.rank).toBe('2');
  });

  it('intersects a client filter with a base constraint on the same field', async () => {
    await PaginationEntity.insertMany([
      { name: 'North One', category: 'north', rank: 1 },
      { name: 'North Two', category: 'north', rank: 2 },
      { name: 'South One', category: 'south', rank: 3 },
    ]);

    const allowed = await paginateQuery({
      model: PaginationEntity,
      req: { query: { category: 'north' } },
      baseFilter: { category: { $in: ['north', 'south'] } },
      allowedFilterFields: ['category'],
    });

    expect(allowed.data.map((item) => item.name).sort()).toEqual(['North One', 'North Two']);

    const forbidden = await paginateQuery({
      model: PaginationEntity,
      req: { query: { category: 'west' } },
      baseFilter: { category: { $in: ['north', 'south'] } },
      allowedFilterFields: ['category'],
    });

    expect(forbidden.data).toHaveLength(0);
    expect(forbidden.pagination.totalItems).toBe(0);
  });
});
