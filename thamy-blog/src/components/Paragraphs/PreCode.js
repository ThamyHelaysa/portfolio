import * as React from 'react'
import styled from 'styled-components'

import BREAKPOINTS from '../../constants/breakpoints'


const Pre = styled.div`
    margin-bottom: 2rem;
    padding: 2rem;
    background-color: ${(props) => props.theme.colors.preCodeBg};
    color: ${(props) => props.theme.colors.preCodeColor};
    white-space: pre-wrap;
    @media (max-width: ${BREAKPOINTS.laptop}){
        width: calc(100vw - (2rem + 4px));
        margin: 0 -4rem 2rem;
        overflow: auto;
        white-space: pre;
    }
    @media (max-width: ${BREAKPOINTS.mobile}){
        width: calc(100vw - 4px);
        margin: 0 -1rem 2rem;
    }
`


const PreCode = ({children}) => {
    return (
        <Pre>
            {children}
        </Pre>
    )
}

export default PreCode;
