import * as React from 'react';
import { graphql, useStaticQuery } from 'gatsby';

import PortifolioCards from './PortifolioCards';

const PortifolioSketchCards = () => {
    const data = useStaticQuery(graphql`
      query {
        allFile(
          filter: {relativeDirectory: {eq: "portifolio/sketch"}}
          sort: {name: ASC}
        ) {
          nodes {
            childImageSharp {
              id
              fluid {
                src
                presentationHeight
                presentationWidth
              }
            }
            name
          }
        }
      }
    `)
    return (
      <PortifolioCards
        className="--app-cards"
        cards={data.allFile.nodes}>    
      </PortifolioCards>
    )
}

export default PortifolioSketchCards;
