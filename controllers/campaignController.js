const Campaign = require('../models/Campaign');

// Obtener todas las campañas, ordenadas con la activa primero, y luego por fecha de creación descendente
exports.getCampaigns = async (req, res) => {
  try {
    const campaigns = await Campaign.find().sort({ isActive: -1, createdAt: -1 });
    res.json(campaigns);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener campañas', error });
  }
};

// Obtener solo la campaña activa
exports.getActiveCampaign = async (req, res) => {
  try {
    const activeCampaign = await Campaign.findOne({ isActive: true });
    if (!activeCampaign) {
      return res.status(404).json({ message: 'No hay campaña activa en este momento.' });
    }
    res.json(activeCampaign);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener la campaña activa', error });
  }
};

// Crear una nueva campaña
exports.createCampaign = async (req, res) => {
  try {
    const body = req.body;

    // Si la nueva campaña se marca como activa, desmarcamos las demás
    if (body.isActive) {
      await Campaign.updateMany({}, { isActive: false });
    }

    const savedCampaign = await Campaign.create(body);
    res.status(201).json(savedCampaign);
  } catch (error) {
    res.status(500).json({ message: 'Error al crear la campaña', error });
  }
};

// Actualizar una campaña
exports.updateCampaign = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Si la campaña a actualizar se marca como activa, desmarcamos las demás
    if (req.body.isActive) {
      await Campaign.updateMany({ id: { $ne: id } }, { isActive: false });
    }

    const updatedCampaign = await Campaign.findByIdAndUpdate(id, req.body);
    if (!updatedCampaign) {
      return res.status(404).json({ message: 'Campaña no encontrada' });
    }

    res.json(updatedCampaign);
  } catch (error) {
    res.status(500).json({ message: 'Error al actualizar la campaña', error });
  }
};

// Eliminar una campaña
exports.deleteCampaign = async (req, res) => {
  try {
    const { id } = req.params;
    const deletedCampaign = await Campaign.findByIdAndDelete(id);
    
    if (!deletedCampaign) {
      return res.status(404).json({ message: 'Campaña no encontrada' });
    }
    
    res.json({ message: 'Campaña eliminada correctamente' });
  } catch (error) {
    res.status(500).json({ message: 'Error al eliminar la campaña', error });
  }
};
