import { GraphQLClient, ClientError, gql } from 'graphql-request';

const GRAPHQL_URL =
  process.env.NEXT_PUBLIC_GRAPHQL_URL || 'http://localhost:3001/graphql';

export const graphqlClient = new GraphQLClient(GRAPHQL_URL);

function getAuthHeaders(): Record<string, string> {
  try {
    const token = localStorage.getItem('ucms_token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  } catch (e) {
    // localStorage not available (e.g. server-side render)
    return {};
  }
}

// Generic request handler for GraphQL queries/mutations
export async function gqlRequest<T = any>(
  document: string,
  variables?: Record<string, unknown>,
): Promise<T> {
  try {
    return await graphqlClient.request<T>(document, variables, getAuthHeaders());
  } catch (error) {
    if (error instanceof ClientError) {
      console.error('GraphQL Error:', error.response.status, error.response.errors);
      if (error.response.status === 401) {
        try {
          localStorage.removeItem('ucms_token');
          localStorage.removeItem('ucms_user');
        } catch (e) {}
      }
    }
    throw error;
  }
}

export { gql };
