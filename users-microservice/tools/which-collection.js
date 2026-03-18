require("dotenv").config();
const mongoose = require("mongoose");

// Ajusta el import a TU modelo real:
const { Usuario, User } = require("../src/models"); // <-- si no existe, importa el modelo real

async function main() {
  await mongoose.connect(process.env.MONGODB_URI);

  const model = Usuario || User; // usa el que exista
  console.log("✅ Model name:", model.modelName);
  console.log("✅ Collection:", model.collection.name);

  const found = await model.findOne({ username: "stafftest" }).lean();
  console.log("✅ Found stafftest?:", !!found);

  await mongoose.disconnect();
}

main().catch((e) => {
  console.error("❌ Error:", e);
  process.exit(1);
});
