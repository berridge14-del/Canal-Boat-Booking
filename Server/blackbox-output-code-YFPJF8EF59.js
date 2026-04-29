function showAvailability(){
  const checkin = document.getElementById('checkin').value;
  const checkout = document.getElementById('checkout').value;
  const section = document.getElementById('availability');
  const output = document.getElementById('selectedDates');

  if(!checkin || !checkout){
    alert('Please select both check-in and check-out dates.');
    return;
  }

  const checkinDate = new Date(checkin);
  const checkoutDate = new Date(checkout);
  const nights = Math.ceil((checkoutDate - checkinDate) / (1000 * 60 * 60 * 24));
  
  // Weekend detection logic
  let baseRate = 245;
  let nightsCount = 0;
  let weekendNights = 0;
  
  for(let d = new Date(checkin); d < checkoutDate; d.setDate(d.getDate() + 1)){
    nightsCount++;
    const day = d.getDay();
    if(day === 0 || day === 6) weekendNights++;
  }
  
  const weekendRate = baseRate * 1.35; // £325 weekend rate
  const total = (nightsCount - weekendNights) * baseRate + weekendNights * weekendRate;
  
  output.innerHTML = `
    <strong>${nights} nights</strong> • 
    ${weekendNights > 0 ? `${weekendNights} weekend nights` : ''} • 
    <strong>£${total.toLocaleString()}</strong> total
  `;
  
  // Dynamic pricing in cards
  document.querySelectorAll('.price').forEach((priceEl, i) => {
    if(i === 0) priceEl.textContent = `£${baseRate}/night (${nights} nights)`;
    if(i === 1) priceEl.textContent = `£${Math.round(weekendRate)}/night`;
    if(i === 2) priceEl.textContent = `From £${Math.round(total * 0.85)}/week`;
  });
  
  section.classList.add('active');
  section.scrollIntoView({behavior:'smooth'});
}