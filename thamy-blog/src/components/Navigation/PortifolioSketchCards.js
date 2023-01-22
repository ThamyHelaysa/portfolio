import * as React from 'react';
import styled from 'styled-components';
import { GatsbyImage } from 'gatsby-plugin-image';
import { graphql, useStaticQuery } from 'gatsby';

const List = styled.ul`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
  gap: 1rem;
`

const Item = styled.li`
  padding: 1rem;
  background-image: url("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAYAAACNMs+9AAAAMklEQVQoU2NkQIAGBgYGEMYKGElRiM0UDDGSTITZTrQbsXkCrhnZarIU4vUMWSZieBAAwlIJi7gntsYAAAAASUVORK5CYII=");
  border: ${(props) => props.theme.colors.border};

`

const PortifolioSketchCards = () => {
    const data = useStaticQuery(graphql`
      query {
        allFile(
          filter: {relativeDirectory: {eq: "portifolio/sketch"}}
          sort: {name: ASC}
        ) {
            nodes {
            childImageSharp {
                gatsbyImageData
                id
            }
            name
          }
        }
      }
    `)
    return (
        <List>
          {data.allFile.nodes.map((item, i) => (
            <Item key={item.childImageSharp.id}>
              <GatsbyImage
                  className='--image'
                  alt={item.name.replaceAll("-", " ")}
                  image={item.childImageSharp.gatsbyImageData}/>
            </Item>
          ))}
        </List>
    )
}

export default PortifolioSketchCards;
