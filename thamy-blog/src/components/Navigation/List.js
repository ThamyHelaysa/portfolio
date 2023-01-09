import * as React from 'react'
import { Link } from 'gatsby';
import styled from 'styled-components'

import { itensOptions } from './List.helpers'

import BREAKPOINTS from '../../constants/breakpoints';


const List = styled.ul`
  display: flex;
  align-items: center;
  gap: 0 3vw;
  padding: 1rem 0;

  @media (max-width: ${BREAKPOINTS.tablet}){
    display: none;
  }

`

const Item = styled.li`
    display: block;
    padding: 0 1rem;
`

const StyledLink = styled(Link)`
    color: inherit;
    letter-spacing: 2px;
    &:hover {
        background-color: ${(props) => props.theme.colors.bodyColor};
    }
`

const NavigationList = () => {
    return (
        <List>
            {itensOptions.map(({ id, content, path }) => (
                <Item key={id}>
                    <StyledLink to={path}>{content}</StyledLink>
                </Item>
            ))}
        </List>
    )
}

export default NavigationList