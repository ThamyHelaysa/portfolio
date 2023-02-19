import * as React from 'react';
import styled from 'styled-components';
import { GatsbyImage } from 'gatsby-plugin-image';
import { graphql, useStaticQuery } from 'gatsby';

import BREAKPOINTS from '../../constants/breakpoints';

const List = styled.ul`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 1rem;
  @media (max-width: ${BREAKPOINTS.tablet}){
    display: flex;
    flex-flow: column;
  }
`

const Item = styled.li`
  display: flex;
  align-items: center;
  padding: 1rem;
  background-image: url("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAYAAACNMs+9AAAAMklEQVQoU2NkQIAGBgYGEMYKGElRiM0UDDGSTITZTrQbsXkCrhnZarIU4vUMWSZieBAAwlIJi7gntsYAAAAASUVORK5CYII=");
  border: ${(props) => props.theme.colors.border};
  &.--item_0 {
    grid-column: span 3;
  }
  &.--item_0, 
  &.--item_1 {
    & > .--image {
      background-color: ${(props) => props.theme.colors.emphaticPProjectBg2};
    }
  }
  & > .--image {
    background-color: ${(props) => props.theme.colors.bgColor};
  }
  &:nth-child(3){
    &, & > .--image{
      background-color: #030917;
    } 
  }
`

const PortifolioAppCards = () => {
    const data = useStaticQuery(graphql`
      query {
        allFile(
          filter: {relativeDirectory: {eq: "portifolio"}}
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
            <Item key={item.childImageSharp.id} className={`--item_${i}`}>
              <GatsbyImage
                  className='--image'
                  alt={item.name.replaceAll("-", " ")}
                  image={item.childImageSharp.gatsbyImageData}/>
            </Item>
          ))}
        </List>
    )
}

export default PortifolioAppCards;
