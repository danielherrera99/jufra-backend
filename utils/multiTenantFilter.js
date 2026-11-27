const isSuperAdmin = (usuario) => {
    return usuario?.rol === 'superadmin' || usuario?.rol === 'admin_nacional';
};

const getUserFraternidadId = (usuario) => {
    return usuario?.fraternidadId || usuario?.fraternidad_id || null;
};

const isAllFilter = (val) => {
    return !val || val === 'all-peru' || val === 'all' || val === 'todas';
};

const resolveTargetFraternidadId = (req) => {
    if (isSuperAdmin(req.usuario)) {
        const fromBody = req.body?.fraternidadId || req.body?.fraternidad_id;
        const fromQuery = req.query?.fraternidadId || req.query?.fraternidad_id;
        if (!isAllFilter(fromBody)) return fromBody;
        if (!isAllFilter(fromQuery)) return fromQuery;
    }
    return getUserFraternidadId(req.usuario);
};

const parseEsNacional = (req) => {
    if (!isSuperAdmin(req.usuario)) return false;
    const raw = req.body?.esNacional !== undefined ? req.body.esNacional : req.body?.es_nacional;
    return raw === true || raw === 'true' || raw === 1 || raw === '1';
};

const buildMultiTenantFilter = (req, baseFiltro = {}, { allowNational = true } = {}) => {
    const filtro = { ...baseFiltro };
    let targetFratId = null;

    if (req.usuario && isSuperAdmin(req.usuario)) {
        const qFrat = req.query?.fraternidadId || req.query?.fraternidad_id;
        if (!isAllFilter(qFrat)) {
            targetFratId = qFrat;
        }
    } else if (req.usuario) {
        targetFratId = getUserFraternidadId(req.usuario);
    } else {
        // Petición pública (ej. sin token): si envían ?fraternidadId=... filtrar por esa fraternidad
        const qFrat = req.query?.fraternidadId || req.query?.fraternidad_id;
        if (!isAllFilter(qFrat)) {
            targetFratId = qFrat;
        }
    }

    if (targetFratId) {
        if (allowNational) {
            const tenantCond = {
                $or: [
                    { fraternidadId: targetFratId },
                    { esNacional: true }
                ]
            };
            filtro.$and = [...(filtro.$and || []), tenantCond];
        } else {
            filtro.fraternidadId = targetFratId;
        }
    }

    return filtro;
};

const canAccessItem = (req, item, { allowNational = true } = {}) => {
    if (!item) return false;
    if (isSuperAdmin(req.usuario)) return true;
    if (allowNational && (item.esNacional || item.es_nacional)) return true;
    const userFrat = getUserFraternidadId(req.usuario);
    const itemFrat = item.fraternidadId || item.fraternidad_id;
    if (!userFrat || !itemFrat) return true;
    return String(userFrat) === String(itemFrat);
};

const canModifyItem = (req, item) => {
    if (!item) return false;
    if (isSuperAdmin(req.usuario)) return true;
    // Un usuario local no debe editar/eliminar contenido marcado como nacional
    if (item.esNacional || item.es_nacional) return false;
    const userFrat = getUserFraternidadId(req.usuario);
    const itemFrat = item.fraternidadId || item.fraternidad_id;
    if (!userFrat || !itemFrat) return true;
    return String(userFrat) === String(itemFrat);
};

module.exports = {
    isSuperAdmin,
    getUserFraternidadId,
    resolveTargetFraternidadId,
    parseEsNacional,
    buildMultiTenantFilter,
    canAccessItem,
    canModifyItem
};
