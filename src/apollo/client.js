import { ApolloClient, InMemoryCache } from "@apollo/client";

const client = new ApolloClient({
  uri: process.env.EXPO_PUBLIC_APOLLO_URI,
  cache: new InMemoryCache(),
});

export default client;