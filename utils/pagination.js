// Utilidad de paginación para listas
exports.paginate = (query, page = 1, limit = 10) => {
  const pageNum = parseInt(page, 10);
  const limitNum = parseInt(limit, 10);

  // Validaciones
  const validPage = pageNum > 0 ? pageNum : 1;
  const validLimit = limitNum > 0 && limitNum <= 100 ? limitNum : 10;

  const skip = (validPage - 1) * validLimit;

  return {
    query: query.skip(skip).limit(validLimit),
    page: validPage,
    limit: validLimit
  };
};

// Generar objeto de paginación para respuesta
exports.getPaginationData = (total, page, limit) => {
  const totalPages = Math.ceil(total / limit);
  const hasNextPage = page < totalPages;
  const hasPrevPage = page > 1;

  return {
    total,
    page,
    limit,
    totalPages,
    hasNextPage,
    hasPrevPage,
    nextPage: hasNextPage ? page + 1 : null,
    prevPage: hasPrevPage ? page - 1 : null
  };
};
