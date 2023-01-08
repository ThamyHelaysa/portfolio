import * as React from 'react'
import { Link } from 'gatsby';
import styled from 'styled-components'

import { itensOptions } from './List.helpers'

import SwapTheme from '../Button/ChangeTheme';


const List = styled.ul`
  display: flex;
  gap: 0 3vw;
  padding: 1rem 0;
`

const Item = styled.li`
    display: block;
    padding: 0 1rem;
`

const StyledLink = styled(Link)`
    color: inherit;
    &:hover {
        background-color: ${(props) => props.theme.colors.extra};
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
            <SwapTheme></SwapTheme>
        </List>
    )
}

export default NavigationList