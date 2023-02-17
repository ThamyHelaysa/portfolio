import { Link } from 'gatsby'
import * as React from 'react'
import styled from 'styled-components'

import { itensOptions } from './List.helpers'

import SwapTheme from '../Button/ChangeTheme';

const Wrapper = styled.div`
    position: fixed;
    display: flex;
    flex-flow: column;
    justify-content: center;
    gap: 2rem 0;
    top: 0;
    left: 0;
    height: 100vh;
    width: 100vw;
    padding: 3rem;
    background: ${(props) => props.theme.colors.bodyColor};
    transform: translateX(-100%);
    transition: transform 350ms ease 0s;
    will-change: transform;
    z-index: 8;
    &.--open{
        transform: translateX(0%);
    }
    & > .--change-theme {
        margin-left: 0;
    }

`

const List = styled.ul`
    display: flex;
    flex-flow: column;
    gap: 1rem 0;
`

const Item = styled.li`
    text-decoration: none;
`

const StyledLink = styled(Link)`
    color: inherit;
`


const MobileNav = ({isOpen}) => {
    return (
        <Wrapper className={isOpen ? "--open" : ""}>
            <List>
                {itensOptions.map(({ id, content, path }) => (
                    <Item key={id}>
                        <StyledLink to={path}>{content}</StyledLink>
                    </Item>
                ))}
            </List>
            <SwapTheme className="--change-theme" />
        </Wrapper>
        
    )
}


export default MobileNav;
