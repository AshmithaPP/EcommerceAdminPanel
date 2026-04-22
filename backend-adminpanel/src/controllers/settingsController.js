const Settings = require('../models/settingsModel');

const settingsController = {
    getAllSettings: async (req, res) => {
        try {
            const settings = await Settings.getAll();
            res.status(200).json({
                success: true,
                data: settings
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Error fetching settings',
                error: error.message
            });
        }
    },

    updateSettings: async (req, res) => {
        try {
            const settingsData = req.body; // Expecting { key1: value1, key2: value2 }
            
            if (!settingsData || typeof settingsData !== 'object') {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid settings data'
                });
            }

            // Update each key in parallel
            const updatePromises = Object.entries(settingsData).map(([key, value]) => 
                Settings.update(key, value)
            );

            await Promise.all(updatePromises);

            res.status(200).json({
                success: true,
                message: 'Settings updated successfully'
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Error updating settings',
                error: error.message
            });
        }
    }
};

module.exports = settingsController;
