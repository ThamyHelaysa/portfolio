import * as React from 'react'
import styled from 'styled-components'

import BREAKPOINTS from '../../constants/breakpoints'


const Quote = styled.blockquote`
    margin: 4rem -2rem;
    padding: 1rem 2rem;
    background-color: ${(props) => props.theme.colors.quoteBg};
    color: ${(props) => props.theme.colors.quoteColor};
    @media (max-width: ${BREAKPOINTS.tablet}){
        margin: 4rem -1rem;
    }
`


const BlockQuote = ({children}) => {
    return (
        <Quote>{children}</Quote>
    )
}

export default BlockQuote;
