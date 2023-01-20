import * as React from 'react'
import styled from 'styled-components'


const Pre = styled.div`
    margin-bottom: 2rem;
    padding: 2rem;
    background-color: ${(props) => props.theme.colors.preCodeBg};
    color: ${(props) => props.theme.colors.preCodeColor};
`


const PreCode = ({children}) => {
    return (
        <Pre>
            {children}
        </Pre>
    )
}

export default PreCode;
