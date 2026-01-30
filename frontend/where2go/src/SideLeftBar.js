import './css/left_bar.css'
import { Image, Button } from 'react-native';
import React, { useState, useEffect } from 'react'

export default function SideLeftBar() {

    const firstDisabilityIcon = require('../assets/hugeicons--disability-02.png');
    const secondDisabilityIcon = require('../assets/hugeicons--disability-02-2.png');

    const firstPOIIcon = require('../assets/gis--poi-alt.png');
    const secondPOIIcon = require('../assets/gis--poi-alt-2.png');

    const firstGPSIcon = require('../assets/lets-icons--gps-fixed.png');
    const secondGPSIcon = require('../assets/ic--round-gps-fixed.png');

    //For Disability Icon Change
    const [iconDisabilitySource, setIconDisabilitySource] = useState(firstDisabilityIcon);
    const [iconDisabilityBC, setIconDisabilityBC] = useState('white');
    const toggleDisabilityIconSource = () => {
        // Check the current source and switch to the other one
        if (iconDisabilitySource === firstDisabilityIcon) {
            setIconDisabilitySource(secondDisabilityIcon);
            setIconDisabilityBC('#912338');
        } else {
            setIconDisabilitySource(firstDisabilityIcon);
            setIconDisabilityBC('white');
        }
    };
    //For POI Icon Change
    const [iconPOISource, setIconPOISource] = useState(firstPOIIcon);
    const [iconPOIBC, setIconPOIBC] = useState('white');
    const togglePOIIconSource = () => {
        // Check the current source and switch to the other one
        if (iconPOISource === firstPOIIcon) {
            setIconPOISource(secondPOIIcon);
            setIconPOIBC('#912338');
        } else {
            setIconPOISource(firstPOIIcon);
            setIconPOIBC('white');
        }

    };
    //For GPS Icon Change
    const [iconGPSSource, setIconGPSSource] = useState(firstGPSIcon);
    const [iconGPSBC, setIconGPSBC] = useState('white');
    const toggleGPSSource = () => {
        // Check the current source and switch to the other one
        if (iconGPSSource === firstGPSIcon) {
            setIconGPSSource(secondGPSIcon);
            setIconGPSBC('#912338');
        } else {
            setIconGPSSource(firstGPSIcon);
            setIconGPSBC('white');
        }
    };


    return (
        <div className="floatLeftBar">
            <div>
                <label class="switch">
                    <input type="checkbox" />
                    <span class="slider round"></span>

                </label>
                <p class="loyolaName">Loyola</p>
                <p class="sgwName">SGW</p>
            </div>
            <div id='disabilityIconContainer' onClick={toggleDisabilityIconSource} style={{ backgroundColor: iconDisabilityBC }}>


                <Image
                    source={iconDisabilitySource}
                    style={{ width: 20, height: 20 }}
                />
            </div>
            <div onClick={togglePOIIconSource} style={{ backgroundColor: iconPOIBC }}>
                <Image
                    source={iconPOISource}
                    style={{ width: 20, height: 20 }}
                />
            </div>
            <div onClick={toggleGPSSource} style={{ backgroundColor: iconGPSBC }}>
                <Image
                    source={iconGPSSource}
                    style={{ width: 20, height: 20 }}
                />
            </div>

        </div>
    );
}