import client from "./client.js";

function toArrayResponse(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.results)) return data.results;
  return [];
}

export async function createUser(payload) {
  const { data } = await client.post("/usuarios/", payload);
  return data;
}

export async function listUsers(params = {}) {
  const { data } = await client.get("/usuarios/", { params });
  return toArrayResponse(data);
}

export async function listClientes() {
  const { data } = await client.get("/usuarios/", { params: { tipo: "CLIENTE" } });
  return toArrayResponse(data);
}

export async function getMe() {
  const { data } = await client.get("/usuarios/me/");
  return data;
}

export async function updateMe(payload) {
  const { data } = await client.patch("/usuarios/me/", payload);
  return data;
}

export async function getUserById(userId) {
  const { data } = await client.get(`/usuarios/${userId}/`);
  return data;
}

export async function updateUser(userId, payload) {
  const { data } = await client.patch(`/usuarios/${userId}/`, payload);
  return data;
}

export async function setUserActive(userId, isActive, passwordConfirmacion) {
  const endpoint = isActive ? "activar" : "desactivar";
  const { data } = await client.post(`/usuarios/${userId}/${endpoint}/`, {
    password_confirmacion: passwordConfirmacion,
  });
  return data;
}

export async function deleteUser(userId, passwordConfirmacion) {
  await client.delete(`/usuarios/${userId}/`, {
    data: { password_confirmacion: passwordConfirmacion },
  });
}

export async function setAvatar(avatarName) {
  const { data } = await client.patch("/usuarios/me/avatar/", { avatar: avatarName });
  return data;
}
