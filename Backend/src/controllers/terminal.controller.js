import Terminal from "../models/Terminal.model.js";
import { getCoordinates } from "../utils/geo.utils.js";

export const searchTerminals = async (req, res) => {
  try {
    let {
      latitude,
      longitude,
      from,           // place name string
      destination,
      maxDistance = 5000,
    } = req.body;

    let resolvedLat = latitude ? parseFloat(latitude) : null;
    let resolvedLng = longitude ? parseFloat(longitude) : null;
    let resolvedFromName = 'Current Location';

    // Priority 1: coordinates provided → use them
    if (resolvedLat && resolvedLng) {
      // good to go
    }
    // Priority 2: no coordinates but from text provided → geocode it
    else if (from?.trim()) {
      const coords = await getCoordinates(from.trim());
      if (coords) {
        resolvedLat = coords.lat;
        resolvedLng = coords.lng;
        resolvedFromName = coords.displayName || from.trim();
      } else {
        return res.status(404).json({
          message: `Could not resolve location: "${from}"`,
          suggestion: "Try a more specific name like 'Merkato' or 'Bole'",
        });
      }
    }
    // Priority 3: nothing useful → error
    else {
      return res.status(400).json({
        message: "Location required: provide coordinates or a starting place name",
      });
    }

    // Basic coordinate validation
    if (isNaN(resolvedLat) || isNaN(resolvedLng) || resolvedLat < -90 || resolvedLat > 90 || resolvedLng < -180 || resolvedLng > 180) {
      return res.status(400).json({ message: "Invalid coordinates" });
    }

    // Build query
    const query = {
      location: {
        $near: {
          $geometry: { type: "Point", coordinates: [resolvedLng, resolvedLat] },
          $maxDistance: Number(maxDistance),
        },
      },
    };

    if (destination?.trim()) {
      query.routes = { $regex: destination.trim(), $options: 'i' }; // fuzzy
    }

    const terminals = await Terminal.find(query);

    const results = terminals.map(t => ({
      ...t.toObject(),
      price: req.user ? t.price : null,
    }));

    res.json({
      results,
      resolvedLocation: {
        lat: resolvedLat,
        lng: resolvedLng,
        fromName: resolvedFromName,
      },
    });
  } catch (error) {
    console.error('searchTerminals error:', error);
    res.status(500).json({ message: "Server error during search" });
  }
};