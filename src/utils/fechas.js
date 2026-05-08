const calcularEdad = (fechaNacimiento) => {
  const hoy = new Date();
  const nacimiento = new Date(fechaNacimiento);
  let edad = hoy.getFullYear() - nacimiento.getFullYear();
  const mes = hoy.getMonth() - nacimiento.getMonth();
  if (mes < 0 || (mes === 0 && hoy.getDate() < nacimiento.getDate())) {
    edad--;
  }
  return edad;
};

const sumarUnMes = (fechaIso) => {
  const d = new Date(fechaIso);
  d.setMonth(d.getMonth() + 1);
  return d.toISOString().slice(0, 10);
};

module.exports = { calcularEdad, sumarUnMes };
