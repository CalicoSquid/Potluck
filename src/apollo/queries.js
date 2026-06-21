// ── GraphQL queries ───────────────────────────────────────────────────────────

import { gql } from "@apollo/client";

export const RANDOM_RECIPE = gql`
  query RandomRecipe($excludeIds: [ID], $daypart: String) {
    randomRecipe(excludeIds: $excludeIds, daypart: $daypart) {
      id
      name
      description
      image
      ingredients
      instructions
      recipeYield
      category
      cuisine
      sourceUrl
      times {
        cook {
          hours
          minutes
        }
        prep {
          hours
          minutes
        }
        total {
          hours
          minutes
        }
      }
    }
  }
`;
