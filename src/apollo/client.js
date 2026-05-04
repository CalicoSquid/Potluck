import { ApolloClient, InMemoryCache, HttpLink } from "@apollo/client";

const uri =
  process.env.EXPO_PUBLIC_APOLLO_URI ||
  "https://savor-app-server-gql-production.up.railway.app";

// Wrap fetch with a 10s timeout — if the server hangs, the request
// aborts and SpinScreen's error handler catches it cleanly.
const fetchWithTimeout = (url, options = {}) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10000);
  return fetch(url, { ...options, signal: controller.signal })
    .finally(() => clearTimeout(timer));
};

const client = new ApolloClient({
  link: new HttpLink({
    uri,
    fetch: fetchWithTimeout,
  }),
  cache: new InMemoryCache(),
});

export default client;