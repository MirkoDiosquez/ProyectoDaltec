import client from "./client.js";

export async function createUser(payload) {
  const { data } = await client.post("/usuarios/", payload);
  return data;
}

export async function listUsers(params = {}) {
  const { data } = await client.get("/usuarios/", { params });
  return data;
}

export async function getMe() {
  const { data } = await client.get("/usuarios/me/");
  return data;
}
