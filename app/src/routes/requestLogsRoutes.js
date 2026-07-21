const express = require('express');

const RequestLog = require('../models/RequestLog');
const { requireApiKeyAndJwt, requireRole } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/asyncHandler');
const { paginateQuery } = require('../services/pagination');

const router = express.Router();

router.use(requireApiKeyAndJwt);
router.use(requireRole('super_admin'));

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const result = await paginateQuery({
      model: RequestLog,
      req,
      baseFilter: {},
      allowedSortFields: ['method', 'path', 'statusCode', 'userId', 'username', 'apiKeyPrefix', 'requestCreatedAt', 'requestCompletedAt', 'totalTimeMs', 'createdAt'],
      defaultSortBy: 'requestCreatedAt',
      defaultSortOrder: 'desc',
      searchableFields: ['method', 'path', 'userId', 'username', 'apiKeyPrefix', 'correlationId'],
    });

    return res.status(200).json(result);
  })
);

module.exports = router;
