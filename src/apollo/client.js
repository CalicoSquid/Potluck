import { ApolloClient, InMemoryCache, HttpLink } from "@apollo/client";

const uri =
  process.env.EXPO_PUBLIC_APOLLO_URI ||
  "https://savor-app-server-gql-production.up.railway.app";

const client = new ApolloClient({
  link: new HttpLink({
    uri,
  }),
  cache: new InMemoryCache(),
});

export default client;