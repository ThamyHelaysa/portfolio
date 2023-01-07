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

const ItemLabel = styled.span`
    display: block;
`

const StyledLink = styled(Link)`
    color: inherit;
`

const StyledAnchor = styled.a`
    color: inherit;
`

const NavigationList = () => {
    return (
        <List>
            {itensOptions.map(({ id, label, content, isLink, path }) => (
                <Item key={id}>
                    <ItemLabel>{label}</ItemLabel>
                    {isLink
                        ? <StyledLink to={path}>{content}</StyledLink>
                        : <StyledAnchor href={path}>{content}</StyledAnchor>
                    }

                </Item>
            ))}
        </List>
    )
}

export default NavigationList