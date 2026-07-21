function canAccessMuseum(user, museumId) {
  if (!user || !museumId) {
    return false;
  }

  if (user.role === 'super_admin') {
    return true;
  }

  return Array.isArray(user.assignedMuseumIds) && user.assignedMuseumIds.includes(museumId);
}

function scopedMuseumFilter(user) {
  if (!user) {
    return { id: '__forbidden__' };
  }

  if (user.role === 'super_admin') {
    return {};
  }

  return {
    id: { $in: user.assignedMuseumIds || [] },
  };
}

module.exports = {
  canAccessMuseum,
  scopedMuseumFilter,
};
