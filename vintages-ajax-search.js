export const vintagesSelector = (editor) => {
    console.log('vintagesSelector')
    const targetFieldInTinyMce = document.querySelector('#Form_EditorVintagepageLink_Link');
    if (!targetFieldInTinyMce) return;
    let niceSelectAdded = false;
    let NSInstance = null;

    const vintagesDropdown = () => {
        let dropdown = document.querySelector('#vintageResultsDropdown');
        if (!dropdown) {
            dropdown = document.createElement('select');
            dropdown.name = 'VintageResults';
            dropdown.id = 'vintageResultsDropdown';
            dropdown.setAttribute('style', 'display: none;');
            targetFieldInTinyMce.parentNode.insertBefore(dropdown, targetFieldInTinyMce.nextSibling);
            dropdown.addEventListener('change', function(e) {
                const selectedValue = e.target.value;
                const selectedLabel = e.target.options[e.target.selectedIndex].text;
                console.log('Selected:', selectedValue, selectedLabel);
                window.vintagesSelectedID = selectedValue;
                targetFieldInTinyMce.value = selectedLabel;
                targetFieldInTinyMce.setAttribute('value', selectedValue);
            });
        }
        return dropdown;
    }

    let timeout = null;
    targetFieldInTinyMce.addEventListener('keyup', function() {
        clearTimeout(timeout);
        const query = this.value;
        const dropdown = vintagesDropdown();
        if (query.length >= 4) {
            window.vintagesSearchQuery = query.trim();
            timeout = setTimeout(() => {
                fetch(`${window.location.protocol}//${window.location.hostname}/api/vintages/?query=${encodeURIComponent(query)}`)
                    .then(response => response.json())
                    .then(data => {
                        dropdown.innerHTML = ''; // Clear previous options
                        if (NSInstance && niceSelectAdded) {
                            NSInstance.destroy();
                            niceSelectAdded = false;
                        }
                        if (data.length) {
                            data.forEach(vintage => {
                                const option = new Option(vintage.title, vintage.id);
                                dropdown.add(option);
                            });
                            dropdown.style.display = 'inline';
                            NSInstance = NiceSelect.bind(dropdown);
                            niceSelectAdded = true;
                        } else {
                            dropdown.style.display = 'none';
                        }
                    })
                    .catch(e => {
                        console.error('Error fetching vintage data:', e);
                        dropdown.style.display = 'none';
                        if (NSInstance && niceSelectAdded) {
                            NSInstance.destroy();
                            niceSelectAdded = false;
                        }
                    });
            }, 300);
        } else {
            dropdown.innerHTML = '';
            dropdown.style.display = 'none';
            if (NSInstance && niceSelectAdded) {
                NSInstance.destroy();
                niceSelectAdded = false;
            }
        }
    });
}
export default vintagesSelector;
