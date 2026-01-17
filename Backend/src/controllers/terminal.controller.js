import Terminal from "../models/Terminal.model.js";

export const searchTerminals = async (req, res) => {
  try {
    // DEBUG: Is req.user set?
    console.log("DEBUG Controller - User is:", req.user ? req.user.username : "Guest (Not Logged In)");

    const { latitude, longitude, destination } = req.body;

    if (!latitude || !longitude) {
      return res.status(400).json({ message: "User location is required" });
    }

    const userLatitude = parseFloat(latitude);
    const userLongitude = parseFloat(longitude);

    const query = {
      location: {
        $near: {
          $geometry: {
            type: "Point",
            coordinates: [userLongitude, userLatitude],
          },
          $maxDistance: 10000, 
        },
      },
    };

    if (destination) {
      query.routes = { $in: [destination] };
    }

    const terminals = await Terminal.find(query);

    if (!terminals.length) {
      return res.status(200).json([]);
    }

    // DEBUG: Check the raw data from Database
    console.log("DEBUG Controller - First DB Result Price:", terminals[0].price);

    const response = terminals.map((terminal) => ({
      _id: terminal._id,
      name: terminal.name,
      area: terminal.area,
      routes: terminal.routes,
      location: terminal.location,
      // LOGIC: Show price ONLY if req.user exists
      price: req.user ? terminal.price : null, 
    }));

    res.status(200).json(response);
  } catch (error) {
    console.error("searchTerminals error:", error);
    res.status(500).json({ message: error.message });
  }
};