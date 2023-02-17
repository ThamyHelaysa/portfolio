import * as React from 'react'
import styled from 'styled-components'

import Button from '../Button/DefaultButton'

import BREAKPOINTS from '../../constants/breakpoints'


const Pre = styled.div`
    position: relative;
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

const CopyButton = styled(Button)`
    position: absolute;
    top: 0;
    right: 0;
    z-index: 2;
    &.--copy > .--ico-copy {
        transform: scale(0);
    }
    &.--copy > .--ico-success {
        transform: scale(1);
    }
`

const Icon = styled.span`
    position: absolute;
    top: 0;
    left: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    height: 100%;
    transition: all 300ms ease 0s;
    &.--ico-success {
        transform: scale(0);
    }
`

const PreCode = ({children}) => {
    const [copyed, setCopyed] = React.useState(false);
    
    const copyToClipboard = React.useCallback(() => {

        navigator.clipboard.writeText(children.props.children.props.children).then(function() {
                setCopyed(true);
                setTimeout(() => {
                    setCopyed(false);
                }, 2500);
            }, function(err) {
                console.error('Async: Could not copy text: ', err);
        });

    }, [children]);

    return (
        <Pre>
            {children}
            {!!navigator.clipboard && <CopyButton className={copyed && "--copy"} onClick={copyToClipboard}>
                <Icon className='--ico-copy'>📋</Icon>
                <Icon className='--ico-success'>✔️</Icon>
            </CopyButton>}
        </Pre>
    )
}

export default PreCode;
