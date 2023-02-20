import * as React from 'react';
import styled from 'styled-components';

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
  padding: 1rem;
  background-image: url("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAYAAACNMs+9AAAAMklEQVQoU2NkQIAGBgYGEMYKGElRiM0UDDGSTITZTrQbsXkCrhnZarIU4vUMWSZieBAAwlIJi7gntsYAAAAASUVORK5CYII=");
  border: ${(props) => props.theme.colors.border};
  & > .--image {
    background-color: ${(props) => props.theme.colors.bgColor};
  }

  ${List}.--app-cards &{
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
  }

`

const ImageWrapper = styled.picture`
  display: block;
`

const PortifolioCards = (props) => {
    return (
        <List {...props}>
          {props.cards.map((item, i) => (
            <Item key={item.childImageSharp.id} className={`--item_${i}`}>
              <ImageWrapper className='--image'>
                <img
                  loading="lazy"
                  src={item.childImageSharp.fluid.src}
                  width={item.childImageSharp.fluid.presentationWidth}
                  height={item.childImageSharp.fluid.presentationHeight}
                  alt={item.name.replaceAll("-", " ")} />
              </ImageWrapper>
            </Item>
          ))}
        </List>
    )
}

export default PortifolioCards;
