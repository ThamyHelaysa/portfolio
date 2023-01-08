import * as React from 'react'
import { Link } from 'gatsby';
import styled from 'styled-components'

import { itensOptions } from './List.helpers'


const List = styled.ul`
  display: flex;
  justify-content: space-around;
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
        </List>
    )
}

export default NavigationList