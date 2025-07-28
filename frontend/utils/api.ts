const {
  public: { apiBaseUrl },
} = useRuntimeConfig();

const apiFetch = $fetch.create({
  baseURL: apiBaseUrl,
});

export default apiFetch;
