import * as React from 'react';
import styled from "styled-components";
import { StaticImage } from "gatsby-plugin-image";


const Link = styled.a`
    display: flex;
    justify-content: center;
`

const BuyMeACoffee = () => {
    return (
        <Link
            href="https://www.buymeacoffee.com/thamyhelaysa"
            target="_blank"
            rel="noopener noreferrer">
            <StaticImage className='--image' width={150} alt="Buy Me A Coffee" src="../../images/yellow_img.png" />
        </Link>
    )
}

export default BuyMeACoffee
