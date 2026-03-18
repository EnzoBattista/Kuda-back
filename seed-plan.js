require("dotenv").config();
const { Plan, conn } = require("./db");

async function seedPlan() {
  try {
    await conn.authenticate();

    const [plan, created] = await Plan.findOrCreate({
      where: { nombre: "Pase Libre VIP" },
      defaults: {
        nombre: "Pase Libre VIP",
        precio: 50000,
        duracion_dias: 30,
      },
    });

    if (!created) {
      plan.precio = 50000;
      plan.duracion_dias = 30;
      await plan.save();
    }

    console.log(
      `Plan listo: ${plan.nombre} | $${plan.precio} | ${plan.duracion_dias} dias`
    );
  } catch (error) {
    console.error("Error al insertar plan de prueba:", error.message);
    process.exitCode = 1;
  } finally {
    await conn.close();
  }
}

seedPlan();
